const GameRoom = require('../models/GameRoom');
const User = require('../models/User');

class XiZachGame {
  static createDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck = [];
    
    for (const suit of suits) {
      for (const value of values) {
        deck.push(`${value}${suit}`);
      }
    }
    
    return this.shuffleDeck(deck);
  }

  static shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  static getCardValue(card) {
    const value = card.slice(0, -1);
    if (['J', 'Q', 'K'].includes(value)) return 10;
    if (value === 'A') return 11;
    return parseInt(value);
  }

  static calculateScore(cards) {
    let score = 0;
    let aces = 0;

    for (const card of cards) {
      const value = this.getCardValue(card);
      if (card.startsWith('A')) {
        aces++;
        score += 11;
      } else {
        score += value;
      }
    }

    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }

    return score;
  }

  static isBlackjack(cards) {
    return cards.length === 2 && this.calculateScore(cards) === 21;
  }

  static isXiBang(cards) {
    return cards.length === 2 && 
           cards.every(card => card.startsWith('A'));
  }

  /**
   * Đánh giá kết quả giữa người chơi và nhà cái theo luật Xì Zách VN:
   * - Xì dách: A + (10/J/Q/K) trong 2 lá đầu, thắng ngay (trừ khi nhà cái cũng xì dách)
   * - Xì bàng: 2 lá A, thắng tất cả (trừ xì dách)
   * - Quắc: >21 thua ngay
   * - Nếu không rơi vào các TH đặc biệt: so điểm gần 21 hơn thắng, bằng điểm thì hòa
   */
  static compareHands(playerCards, dealerCards) {
    const playerScore = this.calculateScore(playerCards);
    const dealerScore = this.calculateScore(dealerCards);

    const playerBlackjack = this.isBlackjack(playerCards);
    const dealerBlackjack = this.isBlackjack(dealerCards);
    const playerXiBang = this.isXiBang(playerCards);
    const dealerXiBang = this.isXiBang(dealerCards);

    // Xử lý xì dách
    if (playerBlackjack || dealerBlackjack) {
      if (playerBlackjack && dealerBlackjack) return 'push';
      if (playerBlackjack) return 'win';
      return 'lose';
    }

    // Xử lý xì bàng
    if (playerXiBang || dealerXiBang) {
      if (playerXiBang && dealerXiBang) return 'push';
      if (playerXiBang) return 'win';
      return 'lose';
    }

    // Quắc
    if (playerScore > 21 && dealerScore > 21) return 'push';
    if (playerScore > 21) return 'lose';
    if (dealerScore > 21) return 'win';

    // So điểm thông thường
    if (playerScore > dealerScore) return 'win';
    if (playerScore < dealerScore) return 'lose';
    return 'push';
  }
}

exports.createRoom = async (req, res) => {
  try {
    const { gameType, betAmount, drawTime, password, roomName } = req.body;
    const userId = req.userId;

    const roomId = Math.random().toString(36).substr(2, 8).toUpperCase();
    
    const room = new GameRoom({
      roomId,
      roomName: roomName || `Bàn ${roomId}`,
      gameType,
      host: userId,
      players: [{
        user: userId,
        position: 0,
        cards: [],
        score: 0,
        status: 'waiting'
      }],
      settings: {
        betAmount,
        drawTime,
        password
      },
      gameState: {
        deck: XiZachGame.createDeck()
      }
    });

    await room.save();
    res.json({ roomId, roomName: room.roomName });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getRooms = async (req, res) => {
  try {
    const { gameType } = req.query;
    const query = { 'gameState.status': 'waiting' };
    if (gameType) {
      query.gameType = gameType;
    }
    
    const rooms = await GameRoom.find(query)
      .populate('host', 'username')
      .populate('players.user', 'username')
      .select('roomId roomName gameType host players settings gameState.status createdAt')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.joinRoom = async (req, res) => {
  try {
    const { roomId, password } = req.body;
    const userId = req.userId;
    
    const room = await GameRoom.findOne({ roomId }).populate('host', 'username');
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy bàn chơi' });
    }
    
    if (room.settings.password && room.settings.password !== password) {
      return res.status(400).json({ message: 'Mật khẩu không đúng' });
    }
    
    if (room.players.length >= 7) {
      return res.status(400).json({ message: 'Bàn đã đầy' });
    }
    
    const playerExists = room.players.find(p => p.user.toString() === userId);
    if (playerExists) {
      return res.json({ roomId: room.roomId, roomName: room.roomName });
    }
    
    room.players.push({
      user: userId,
      position: room.players.length,
      cards: [],
      score: 0,
      status: 'waiting'
    });
    
    await room.save();
    res.json({ roomId: room.roomId, roomName: room.roomName });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.XiZachGame = XiZachGame;
