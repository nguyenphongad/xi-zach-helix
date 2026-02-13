const mongoose = require('mongoose');

const gameRoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  roomName: {
    type: String,
    default: ''
  },
  gameType: {
    type: String,
    required: true,
    enum: ['xizach', 'tienlenmiennam']
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  players: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    position: Number,
    cards: [String],
    score: Number,
    status: { type: String, enum: ['waiting', 'playing', 'stand', 'bust'] },
    // Trạng thái sẵn sàng trước khi bắt đầu ván
    isReady: { type: Boolean, default: false }
  }],
  settings: {
    betAmount: Number,
    drawTime: { type: Number, default: 30 },
    password: String
  },
  gameState: {
    status: { type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting' },
    currentPlayerIndex: Number,
    deck: [String],
    dealerCards: [String],
    dealerScore: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('GameRoom', gameRoomSchema);
