const express = require('express');
const gameController = require('../controllers/gameController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/rooms', authMiddleware, gameController.getRooms);
router.post('/create-room', authMiddleware, gameController.createRoom);
router.post('/join-room', authMiddleware, gameController.joinRoom);

module.exports = router;
