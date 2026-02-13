const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    default: 10000
  },
  gameHistory: [{
    gameType: String,
    result: String,
    amount: Number,
    date: { type: Date, default: Date.now }
  }],
  isOnline: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Dùng để \"neo\" người chơi hiện đang ở bàn nào (nếu có)
  currentRoomId: {
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
