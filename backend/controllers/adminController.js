const Admin = require('../models/Admin');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getIo } = require('../socket');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(400).json({ message: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(400).json({ message: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    const token = jwt.sign(
      { adminId: admin._id.toString() },
      process.env.JWT_SECRET
    );
    return res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        balance: admin.balance,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getPlayers = async (req, res) => {
  try {
    const players = await User.find({})
      .select('username balance isActive isOnline createdAt')
      .sort({ createdAt: -1 });
    return res.json(players);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 4) {
      return res.status(400).json({ message: 'Mật khẩu mới tối thiểu 4 ký tự' });
    }
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người chơi' });
    user.password = newPassword;
    await user.save();
    return res.json({ message: 'Đã đổi mật khẩu' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.setActive = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người chơi' });
    user.isActive = !user.isActive;
    await user.save();
    return res.json({ isActive: user.isActive, message: user.isActive ? 'Đã kích hoạt' : 'Đã vô hiệu hóa' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.transfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const numAmount = Number(amount);
    if (!Number.isInteger(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Số xu không hợp lệ' });
    }
    const admin = await Admin.findById(req.adminId);
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người chơi' });
    if (admin.balance < numAmount) {
      return res.status(400).json({ message: 'Số dư admin không đủ' });
    }
    admin.balance -= numAmount;
    user.balance += numAmount;
    await admin.save();
    await user.save();

    // Emit socket event cho người chơi được cộng xu (nếu đang online / có socket)
    const io = getIo();
    if (io) {
      io.to(`user_${user._id.toString()}`).emit('balanceUpdate', {
        type: 'admin_transfer',
        userId: user._id.toString(),
        amount: numAmount,
        direction: 'increase',
        newBalance: user.balance,
        message: `Admin đã cộng cho bạn ${numAmount.toLocaleString()} xu`,
      });
    }

    return res.json({
      message: 'Chuyển xu thành công',
      adminBalance: admin.balance,
      playerBalance: user.balance,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.transferAll = async (req, res) => {
  try {
    const { playerIds, amount } = req.body;
    const numAmount = Number(amount);
    if (!Array.isArray(playerIds) || !playerIds.length || !Number.isInteger(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Chọn người chơi và nhập số xu hợp lệ' });
    }
    const admin = await Admin.findById(req.adminId);
    const total = numAmount * playerIds.length;
    if (admin.balance < total) {
      return res.status(400).json({ message: `Số dư admin không đủ (cần ${total.toLocaleString()} xu)` });
    }
    const users = await User.find({ _id: { $in: playerIds } });
    for (const user of users) {
      user.balance += numAmount;
      await user.save();
    }
    admin.balance -= total;
    await admin.save();

    // Emit socket event cho từng user được cộng xu
    const io = getIo();
    if (io) {
      users.forEach((user) => {
        io.to(`user_${user._id.toString()}`).emit('balanceUpdate', {
          type: 'admin_transfer_all',
          userId: user._id.toString(),
          amount: numAmount,
          direction: 'increase',
          newBalance: user.balance,
          message: `Admin đã cộng cho bạn ${numAmount.toLocaleString()} xu`,
        });
      });
    }

    return res.json({
      message: `Đã chuyển ${numAmount.toLocaleString()} xu cho ${users.length} người chơi`,
      adminBalance: admin.balance,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Trừ xu người chơi
exports.deduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const numAmount = Number(amount);
    if (!Number.isInteger(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Số xu không hợp lệ' });
    }
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người chơi' });
    if (numAmount >= user.balance) {
      return res.status(400).json({ message: 'Số xu cần trừ phải nhỏ hơn số dư hiện tại của người chơi' });
    }
    user.balance -= numAmount;
    await user.save();

    // Emit socket event cho người chơi bị trừ xu
    const io = getIo();
    if (io) {
      io.to(`user_${user._id.toString()}`).emit('balanceUpdate', {
        type: 'admin_deduct',
        userId: user._id.toString(),
        amount: numAmount,
        direction: 'decrease',
        newBalance: user.balance,
        message: `Admin đã trừ của bạn ${numAmount.toLocaleString()} xu`,
      });
    }

    return res.json({
      message: 'Đã trừ xu người chơi',
      playerBalance: user.balance,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// Xóa người chơi
exports.deletePlayer = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người chơi' });
    }
    await User.deleteOne({ _id: id });
    return res.json({ message: 'Đã xóa người chơi' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.createPlayers = async (req, res) => {
  try {
    const { players } = req.body; // Array of { username, password }
    if (!Array.isArray(players) || !players.length) {
      return res.status(400).json({ message: 'Danh sách người chơi không hợp lệ' });
    }

    const results = {
      success: [],
      failed: [],
    };

    for (const player of players) {
      const { username, password } = player;
      if (!username || !password || username.trim() === '' || password.trim() === '') {
        results.failed.push({ username: username || '(trống)', reason: 'Thiếu username hoặc password' });
        continue;
      }

      try {
        // Kiểm tra username đã tồn tại chưa
        const existing = await User.findOne({ username: username.trim() });
        if (existing) {
          results.failed.push({ username, reason: 'Username đã tồn tại' });
          continue;
        }

        const newUser = new User({
          username: username.trim(),
          password: password.trim(),
          balance: 0, // Số dư mặc định là 0
          isActive: true,
        });

        await newUser.save();
        results.success.push({ username: newUser.username, id: newUser._id });
      } catch (error) {
        results.failed.push({ username, reason: error.message || 'Lỗi không xác định' });
      }
    }

    return res.json({
      message: `Đã tạo ${results.success.length} người chơi thành công${results.failed.length > 0 ? `, ${results.failed.length} thất bại` : ''}`,
      results,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.me = async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).select('username balance');
    if (!admin) return res.status(401).json({ message: 'Unauthorized' });
    return res.json(admin);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};
