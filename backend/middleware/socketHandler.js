const GameRoom = require('../models/GameRoom');
const User = require('../models/User');
const { XiZachGame } = require('../controllers/gameController');

// Store active timers for rooms
const roomTimers = {};
const hostStageTimers = {};

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinRoom', async (data) => {
      const { roomId, userId } = data;
      
      try {
        const room = await GameRoom.findOne({ roomId })
          .populate('players.user', 'username balance')
          .populate('host', 'username');
        const user = await User.findById(userId);
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        socket.join(roomId);
        socket.userId = userId;
        socket.roomId = roomId;
        // Join a personal room for user-level notifications (balance changes, etc.)
        if (userId) {
          socket.join(`user_${userId}`);
        }

        const playerExists = room.players.find(p => p.user._id.toString() === userId);
        
        if (!playerExists && room.players.length < 7) {
          room.players.push({
            user: userId,
            position: room.players.length,
            cards: [],
            score: 0,
            status: 'waiting'
          });
        }

        // Cập nhật trạng thái user đang ở bàn nào
        if (user) {
          user.currentRoomId = roomId;
          user.isOnline = true;
          await user.save();
        }

        await room.save();

        const updatedRoom = await GameRoom.findOne({ roomId })
          .populate('players.user', 'username balance')
          .populate('host', 'username');
        
        io.to(roomId).emit('roomUpdate', updatedRoom);
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });

    socket.on('startGame', async (data) => {
      const { roomId } = data;
      // Sử dụng hàm dùng chung, nhưng vẫn giữ event để tránh lỗi client cũ
      try {
        const room = await GameRoom.findOne({ roomId })
          .populate('players.user', 'username balance');

        await startGameInternal(io, room);
      } catch (error) {
        console.error('Start game error:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });

    socket.on('hit', async (data) => {
      const { roomId } = data;
      console.log('[socket] hit received', { roomId, socketUserId: socket.userId });
      
      try {
        const room = await GameRoom.findOne({ roomId })
          .populate('players.user', 'username balance');
        
        const currentPlayerIndex = room.gameState.currentPlayerIndex;
        const player = room.players[currentPlayerIndex];
        
        if (!player || player.user._id.toString() !== socket.userId) {
          console.log('[socket] hit: not player turn', {
            currentPlayerIndex,
            currentPlayerUserId: player && player.user && player.user._id && player.user._id.toString(),
          });
          socket.emit('error', { message: 'Không phải lượt của bạn' });
          return;
        }

        if (player.status !== 'playing') {
          console.log('[socket] hit: invalid status', { status: player.status });
          socket.emit('error', { message: 'Cannot hit' });
          return;
        }

        // Clear timer
        if (roomTimers[roomId]) {
          clearTimeout(roomTimers[roomId].timeout);
          clearInterval(roomTimers[roomId].interval);
        }

        const newCard = room.gameState.deck.pop();
        player.cards.push(newCard);
        player.score = XiZachGame.calculateScore(player.cards);
        console.log('[socket] hit: new card & score', {
          userId: player.user._id.toString(),
          newCard,
          cards: player.cards,
          score: player.score,
        });

        if (player.score > 21) {
          player.status = 'bust';
          console.log('[socket] hit: player bust, moving to next');
          // Move to next player
          moveToNextPlayer(io, roomId, room);
        } else {
          // Continue timer for same player
          startPlayerTurn(io, roomId, currentPlayerIndex, room.settings.drawTime);
        }

        await room.save();
        
        const updatedRoom = await GameRoom.findOne({ roomId })
          .populate('players.user', 'username balance')
          .populate('host', 'username');
        
        io.to(roomId).emit('playerHit', { player, room: updatedRoom });
      } catch (error) {
        console.error('Hit error:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });

    socket.on('stand', async (data) => {
      const { roomId } = data;
      console.log('[socket] stand received', { roomId, socketUserId: socket.userId });
      
      try {
        const room = await GameRoom.findOne({ roomId })
          .populate('players.user', 'username balance');
        
        const currentPlayerIndex = room.gameState.currentPlayerIndex;
        const player = room.players[currentPlayerIndex];
        
        if (!player || player.user._id.toString() !== socket.userId) {
          console.log('[socket] stand: not player turn', {
            currentPlayerIndex,
            currentPlayerUserId: player && player.user && player.user._id && player.user._id.toString(),
          });
          socket.emit('error', { message: 'Không phải lượt của bạn' });
          return;
        }

        if (player.status !== 'playing') {
          console.log('[socket] stand: invalid status', { status: player.status });
          socket.emit('error', { message: 'Cannot stand' });
          return;
        }

        // Clear timer
        if (roomTimers[roomId]) {
          clearTimeout(roomTimers[roomId].timeout);
          clearInterval(roomTimers[roomId].interval);
        }

        player.status = 'stand';
        console.log('[socket] stand: player stand, moving to next', {
          userId: player.user._id.toString(),
        });
        await room.save();
        
        const updatedRoom = await GameRoom.findOne({ roomId })
          .populate('players.user', 'username balance')
          .populate('host', 'username');
        
        io.to(roomId).emit('playerStand', { player, room: updatedRoom });

        // Move to next player
        moveToNextPlayer(io, roomId, updatedRoom);
      } catch (error) {
        console.error('Stand error:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });

    socket.on('transferHost', async (data) => {
      const { roomId, newHostId } = data;
      
      try {
        const room = await GameRoom.findOne({ roomId });
        
        if (room.host.toString() !== socket.userId) {
          socket.emit('error', { message: 'Chỉ chủ cái mới có thể chuyển quyền' });
          return;
        }

        const newHostExists = room.players.find(
          p => p.user.toString() === newHostId
        );

        if (!newHostExists) {
          socket.emit('error', { message: 'Người chơi không tồn tại trong bàn' });
          return;
        }

        room.host = newHostId;
        await room.save();

        const updatedRoom = await GameRoom.findOne({ roomId })
          .populate('players.user', 'username balance')
          .populate('host', 'username');
        
        io.to(roomId).emit('hostTransferred', updatedRoom);
      } catch (error) {
        console.error('Transfer host error:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });

    // Donate xu giữa các người chơi trong bàn
    socket.on('donate', async (data) => {
      const { roomId, toUserId, amount } = data;

      try {
        const value = Number(amount);
        if (!value || value <= 0) {
          socket.emit('error', { message: 'Số xu donate không hợp lệ' });
          return;
        }

        const fromUserId = socket.userId;
        if (!fromUserId) {
          socket.emit('error', { message: 'Không xác định được người donate' });
          return;
        }

        const [fromUser, toUser] = await Promise.all([
          User.findById(fromUserId),
          User.findById(toUserId),
        ]);

        if (!fromUser || !toUser) {
          socket.emit('error', { message: 'Người chơi không tồn tại' });
          return;
        }

        if (fromUser.balance < value) {
          socket.emit('error', { message: 'Không đủ xu để donate' });
          return;
        }

        fromUser.balance -= value;
        toUser.balance += value;
        await fromUser.save();
        await toUser.save();

        // Bắn sự kiện tới cả phòng để UI cập nhật + thông báo cho người nhận
        io.to(roomId).emit('donateReceived', {
          roomId,
          toUserId: toUser._id.toString(),
          fromUser: { id: fromUser._id.toString(), username: fromUser.username },
          amount: value,
        });

        // Cập nhật lại thông tin phòng (balance của players.user)
        const updatedRoom = await GameRoom.findOne({ roomId })
          .populate('players.user', 'username balance')
          .populate('host', 'username');
        io.to(roomId).emit('roomUpdate', updatedRoom);
      } catch (error) {
        console.error('Donate error:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });

    // Chủ bàn buộc 1 người rời bàn
    socket.on('kickPlayer', async (data) => {
      const { roomId, targetUserId } = data;

      try {
        const room = await GameRoom.findOne({ roomId });
        if (!room) return;

        if (room.host.toString() !== socket.userId) {
          socket.emit('error', { message: 'Chỉ chủ bàn mới có quyền đuổi người' });
          return;
        }

        const before = room.players.length;
        room.players = room.players.filter(
          (p) => p.user.toString() !== targetUserId
        );

        if (room.players.length === before) {
          return;
        }

        // Nếu phòng rỗng sau khi đuổi thì xóa phòng
        if (room.players.length === 0) {
          if (roomTimers[roomId]) {
            clearTimeout(roomTimers[roomId].timeout);
            clearInterval(roomTimers[roomId].interval);
            delete roomTimers[roomId];
          }
          await GameRoom.deleteOne({ roomId });
          io.to(roomId).emit('roomDeleted');
          return;
        }

        await room.save();

        const updatedRoom = await GameRoom.findOne({ roomId })
          .populate('players.user', 'username balance')
          .populate('host', 'username');

        io.to(roomId).emit('playerKicked', {
          targetUserId,
          roomName: room.roomName || room.roomId,
        });
        io.to(roomId).emit('roomUpdate', updatedRoom);
      } catch (error) {
        console.error('Kick player error:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });

    // Host xem kết quả riêng với một người chơi (preview)
    socket.on('hostShowPlayer', async (data) => {
      const { roomId, targetUserId } = data;
      console.log('[socket] hostShowPlayer received', {
        roomId,
        socketUserId: socket.userId,
        targetUserId,
      });

      try {
        const room = await GameRoom.findOne({ roomId });
        if (!room) return;

        if (room.host.toString() !== socket.userId) {
          socket.emit('error', { message: 'Chỉ nhà cái mới có quyền xem kết quả từng người' });
          return;
        }

        const player = room.players.find(
          (p) => p.user.toString() === targetUserId
        );
        if (!player) {
          socket.emit('error', { message: 'Không tìm thấy người chơi' });
          return;
        }

        if (!room.gameState.dealerCards || room.gameState.dealerCards.length === 0) {
          socket.emit('error', { message: 'Chưa có bài nhà cái để so sánh' });
          return;
        }

        const outcome = XiZachGame.compareHands(
          player.cards,
          room.gameState.dealerCards
        );
        const finalScore = XiZachGame.calculateScore(player.cards);

        io.to(roomId).emit('hostShowResult', {
          roomId,
          playerId: player.user.toString(),
          username: player.user.username,
          cards: player.cards,
          finalScore,
          outcome,
        });

        // Reset lại đồng hồ host 60s phía backend
        if (hostStageTimers[roomId]) {
          clearTimeout(hostStageTimers[roomId]);
        }
        hostStageTimers[roomId] = setTimeout(async () => {
          try {
            console.log('[socket] hostStage timeout after show, auto finishRound', { roomId });
            const latestRoom = await GameRoom.findOne({ roomId });
            if (latestRoom) {
              await finishRound(io, roomId, latestRoom);
            }
          } catch (e) {
            console.error('hostStage auto finish error (after show):', e);
          } finally {
            delete hostStageTimers[roomId];
          }
        }, 60000);
      } catch (error) {
        console.error('hostShowPlayer error:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });
    // Host kết thúc ván (sau khi đã xem bài)
    socket.on('hostEndRound', async (data) => {
      const { roomId } = data;
      console.log('[socket] hostEndRound received', {
        roomId,
        socketUserId: socket.userId,
      });

      try {
        const room = await GameRoom.findOne({ roomId });
        if (!room) return;

        if (room.host.toString() !== socket.userId) {
          socket.emit('error', { message: 'Chỉ nhà cái mới có quyền kết thúc ván' });
          return;
        }

        // Clear host-stage auto timer nếu có
        if (hostStageTimers[roomId]) {
          clearTimeout(hostStageTimers[roomId]);
          delete hostStageTimers[roomId];
        }

        await finishRound(io, roomId, room);
      } catch (error) {
        console.error('hostEndRound error:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });

    // Người chơi bấm sẵn sàng / hủy sẵn sàng
    socket.on('toggleReady', async (data) => {
      const { roomId } = data;
      console.log('[socket] toggleReady received', {
        roomId,
        socketUserId: socket.userId,
      });

      try {
        const room = await GameRoom.findOne({ roomId })
          .populate('players.user', 'username balance')
          .populate('host', 'username');
        if (!room) {
          console.log('[socket] toggleReady: room not found', roomId);
          return;
        }

        console.log('[socket] toggleReady: players in room', room.players.map((p) => ({
          userId: p.user && (p.user._id ? p.user._id.toString() : p.user.toString()),
          isReady: p.isReady,
        })));

        // Khi đã populate, p.user là document => dùng _id
        const player = room.players.find((p) => {
          if (!p.user) return false;
          if (p.user._id) {
            return p.user._id.toString() === socket.userId;
          }
          return p.user.toString() === socket.userId;
        });

        if (!player) {
          console.log('[socket] toggleReady: player not found for socketUserId', socket.userId);
          return;
        }

        player.isReady = !player.isReady;
        console.log('[socket] toggleReady: toggled isReady to', player.isReady);
        await room.save();

        const updatedRoom = await GameRoom.findOne({ roomId })
          .populate('players.user', 'username balance')
          .populate('host', 'username');

        io.to(roomId).emit('roomUpdate', updatedRoom);

        // Nếu tất cả đã sẵn sàng thì tự động bắt đầu ván
        await startGameInternal(io, updatedRoom);
      } catch (error) {
        console.error('Toggle ready error:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });

    socket.on('leaveRoom', async (data) => {
      const { roomId } = data;
      
      try {
        const room = await GameRoom.findOne({ roomId });
        
        if (!room) return;

        // Remove player from room
        room.players = room.players.filter(
          p => p.user.toString() !== socket.userId
        );

        // Cập nhật trạng thái user rời bàn
        const user = await User.findById(socket.userId);
        if (user) {
          user.currentRoomId = null;
          await user.save();
        }

        // If no players left, delete room
        if (room.players.length === 0) {
          // Clear timer if exists
          if (roomTimers[roomId]) {
            clearTimeout(roomTimers[roomId].timeout);
            clearInterval(roomTimers[roomId].interval);
            delete roomTimers[roomId];
          }
          await GameRoom.deleteOne({ roomId });
          io.to(roomId).emit('roomDeleted');
          return;
        }

        // If host left and there are players, assign new host
        if (room.host.toString() === socket.userId && room.players.length > 0) {
          room.host = room.players[0].user;
        }

        await room.save();

        const updatedRoom = await GameRoom.findOne({ roomId })
          .populate('players.user', 'username balance')
          .populate('host', 'username');
        
        io.to(roomId).emit('roomUpdate', updatedRoom);
      } catch (error) {
        console.error('Leave room error:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });

    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      
      // Handle disconnect - remove player from room
      if (socket.roomId) {
        try {
          const room = await GameRoom.findOne({ roomId: socket.roomId });
          
          if (!room) return;

          room.players = room.players.filter(
            p => p.user.toString() !== socket.userId
          );

          // Cập nhật trạng thái user rời bàn
          const user = await User.findById(socket.userId);
          if (user) {
            user.currentRoomId = null;
            await user.save();
          }

          if (room.players.length === 0) {
            if (roomTimers[room.roomId]) {
              clearTimeout(roomTimers[room.roomId].timeout);
              clearInterval(roomTimers[room.roomId].interval);
              delete roomTimers[room.roomId];
            }
            await GameRoom.deleteOne({ roomId: socket.roomId });
            io.to(socket.roomId).emit('roomDeleted');
            return;
          }

          if (room.host.toString() === socket.userId && room.players.length > 0) {
            room.host = room.players[0].user;
          }

          await room.save();

          const updatedRoom = await GameRoom.findOne({ roomId: socket.roomId })
            .populate('players.user', 'username balance')
            .populate('host', 'username');
          
          io.to(socket.roomId).emit('roomUpdate', updatedRoom);
        } catch (error) {
          console.error('Disconnect cleanup error:', error);
        }
      }
    });
  });
};

// Hàm dùng chung để bắt đầu ván khi tất cả đã sẵn sàng
async function startGameInternal(io, room) {
  if (!room) return;

  // Chỉ bắt đầu nếu đang ở trạng thái chờ
  if (room.gameState.status !== 'waiting') return;

  // Tất cả người chơi phải bấm sẵn sàng
  const allReady = room.players.length > 0 && room.players.every(p => p.isReady);
  if (!allReady) return;

  console.log('[socket] startGameInternal called', {
    roomId: room.roomId,
    players: room.players.map((p) => ({
      userId: p.user.toString(),
      isReady: p.isReady,
    })),
  });

  // Bắt đầu ván
  room.gameState.status = 'playing';
  room.gameState.deck = XiZachGame.createDeck();

  // Xác định người chơi đầu tiên: người đầu tiên KHÔNG phải nhà cái
  let hostId;
  if (room.host && room.host._id) {
    hostId = room.host._id.toString();
  } else if (room.host) {
    hostId = room.host.toString();
  }

  const firstNonHostIndex =
    hostId != null
      ? room.players.findIndex((p) => {
          if (!p.user) return false;
          const userId =
            p.user && p.user._id ? p.user._id.toString() : p.user.toString();
          return userId !== hostId;
        })
      : 0;

  const startIndex = firstNonHostIndex === -1 ? 0 : firstNonHostIndex;
  room.gameState.currentPlayerIndex = startIndex;

  // Phát 2 lá cho mỗi người chơi ngay khi bắt đầu ván
  for (let player of room.players) {
    player.cards = [room.gameState.deck.pop(), room.gameState.deck.pop()];
    player.score = XiZachGame.calculateScore(player.cards);
    player.status = 'playing';
  }

  // Bài nhà cái (2 lá, nhưng client vẫn có thể ẩn theo luật hiển thị)
  room.gameState.dealerCards = [room.gameState.deck.pop(), room.gameState.deck.pop()];
  room.gameState.dealerScore = XiZachGame.calculateScore(room.gameState.dealerCards);

  await room.save();

  const updatedRoom = await GameRoom.findOne({ roomId: room.roomId })
    .populate('players.user', 'username balance')
    .populate('host', 'username');

  // Gửi trạng thái bắt đầu ván cho client (client sẽ show hiệu ứng phát bài)
  io.to(room.roomId).emit('gameStarted', updatedRoom);

  // Sau 2s (thời gian phát bài), mới bắt đầu lượt đầu tiên
  setTimeout(() => {
    console.log('[socket] start first turn', {
      roomId: room.roomId,
      startIndex,
      startUserId: room.players[startIndex] && room.players[startIndex].user.toString(),
    });
    startPlayerTurn(io, room.roomId, startIndex, room.settings.drawTime);
  }, 2000);
}

function startPlayerTurn(io, roomId, playerIndex, drawTime) {
  // Clear existing timer
  if (roomTimers[roomId]) {
    clearTimeout(roomTimers[roomId].timeout);
    clearInterval(roomTimers[roomId].interval);
  }

  let timeLeft = drawTime;

  // Emit initial turn
  console.log('[socket] startPlayerTurn', {
    roomId,
    playerIndex,
    drawTime,
  });
  io.to(roomId).emit('playerTurn', { playerIndex, timeLeft });

  // Update time every second
  const interval = setInterval(() => {
    timeLeft--;
    io.to(roomId).emit('playerTurn', { playerIndex, timeLeft });
    
    if (timeLeft <= 0) {
      clearInterval(interval);
    }
  }, 1000);

  // Auto stand when time runs out
  const timeout = setTimeout(async () => {
    try {
      const room = await GameRoom.findOne({ roomId })
        .populate('players.user', 'username balance');
      
      const player = room.players[playerIndex];
      if (player && player.status === 'playing') {
        player.status = 'stand';
        await room.save();
        
        const updatedRoom = await GameRoom.findOne({ roomId })
          .populate('players.user', 'username balance')
          .populate('host', 'username');
        
        io.to(roomId).emit('playerStand', { player, room: updatedRoom });
        moveToNextPlayer(io, roomId, updatedRoom);
      }
    } catch (error) {
      console.error('Auto stand error:', error);
    }
  }, drawTime * 1000);

  roomTimers[roomId] = { timeout, interval };
}

async function startHostStage(io, roomId, room) {
  try {
    const updatedRoom = await GameRoom.findOne({ roomId })
      .populate('players.user', 'username balance')
      .populate('host', 'username');

    console.log('[socket] startHostStage', {
      roomId,
      hostId: updatedRoom.host.toString(),
    });

    io.to(roomId).emit('hostStage', updatedRoom);

    // Tự động kết thúc sau 60s nếu host không bấm
    if (hostStageTimers[roomId]) {
      clearTimeout(hostStageTimers[roomId]);
    }
    hostStageTimers[roomId] = setTimeout(async () => {
      try {
        console.log('[socket] hostStage timeout, auto finishRound', { roomId });
        const latestRoom = await GameRoom.findOne({ roomId });
        if (latestRoom) {
          await finishRound(io, roomId, latestRoom);
        }
      } catch (e) {
        console.error('hostStage auto finish error:', e);
      } finally {
        delete hostStageTimers[roomId];
      }
    }, 60000);
  } catch (e) {
    console.error('startHostStage error:', e);
  }
}

function moveToNextPlayer(io, roomId, room) {
  // Find next player who is still playing
  let nextIndex = (room.gameState.currentPlayerIndex + 1) % room.players.length;
  let attempts = 0;

  while (
    attempts < room.players.length &&
    (room.players[nextIndex].status === 'stand' ||
     room.players[nextIndex].status === 'bust')
  ) {
    nextIndex = (nextIndex + 1) % room.players.length;
    attempts++;
  }

  // If all players are done, dealer plays
  if (
    room.players[nextIndex].status === 'stand' ||
    room.players[nextIndex].status === 'bust'
  ) {
    console.log('[socket] moveToNextPlayer: all players done, host stage');
    startHostStage(io, roomId, room);
    return;
  }

  room.gameState.currentPlayerIndex = nextIndex;
  console.log('[socket] moveToNextPlayer: next player', {
    roomId,
    nextIndex,
    userId: room.players[nextIndex].user.toString(),
  });
  room.save().then(() => {
    startPlayerTurn(io, roomId, nextIndex, room.settings.drawTime);
    
    GameRoom.findOne({ roomId })
      .populate('players.user', 'username balance')
      .populate('host', 'username')
      .then((updatedRoom) => {
        io.to(roomId).emit('roomUpdate', updatedRoom);
      });
  });
}

async function finishRound(io, roomId, room) {
  try {
    // Dealer draws until >= 16
    while (room.gameState.dealerScore < 16 && room.gameState.deck.length > 0) {
      const newCard = room.gameState.deck.pop();
      room.gameState.dealerCards.push(newCard);
      room.gameState.dealerScore = XiZachGame.calculateScore(room.gameState.dealerCards);
    }

    room.gameState.status = 'finished';

    const results = [];
    for (const p of room.players) {
      const outcome = XiZachGame.compareHands(p.cards, room.gameState.dealerCards);
      results.push({
        playerId: p.user.toString(),
        outcome,
        finalScore: XiZachGame.calculateScore(p.cards)
      });

      const user = await User.findById(p.user);
      if (!user) continue;

      let amountChange = 0;
      if (outcome === 'win') amountChange = room.settings.betAmount;
      if (outcome === 'lose') amountChange = -room.settings.betAmount;

      user.balance += amountChange;
      user.gameHistory.push({
        gameType: room.gameType,
        result: outcome,
        amount: amountChange
      });
      await user.save();
    }

    // Clear timer
    if (roomTimers[roomId]) {
      clearTimeout(roomTimers[roomId].timeout);
      clearInterval(roomTimers[roomId].interval);
      delete roomTimers[roomId];
    }

    await room.save();

    const updatedRoom = await GameRoom.findOne({ roomId })
      .populate('players.user', 'username balance')
      .populate('host', 'username');
    
    console.log('[socket] finishRound results', {
      roomId,
      results,
    });

    io.to(roomId).emit('roundFinished', {
      room: updatedRoom,
      results
    });

    // Reset room về trạng thái chờ ván mới, tất cả chưa sẵn sàng
    room.gameState.status = 'waiting';
    room.gameState.currentPlayerIndex = null;
    room.gameState.deck = [];
    room.gameState.dealerCards = [];
    room.gameState.dealerScore = 0;
    room.players.forEach((p) => {
      p.isReady = false;
      p.cards = [];
      p.score = 0;
      p.status = 'waiting';
    });
    await room.save();

    const resetRoom = await GameRoom.findOne({ roomId })
      .populate('players.user', 'username balance')
      .populate('host', 'username');

    io.to(roomId).emit('roomUpdate', resetRoom);
  } catch (error) {
    console.error('Finish round error:', error);
  }
}
