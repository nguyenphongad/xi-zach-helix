const express = require('express');
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

router.post('/login', adminController.login);
router.get('/me', adminAuth, adminController.me);
router.get('/players', adminAuth, adminController.getPlayers);
router.post('/players/create', adminAuth, adminController.createPlayers);
router.patch('/players/:id/password', adminAuth, adminController.changePassword);
router.patch('/players/:id/active', adminAuth, adminController.setActive);
router.post('/players/:id/transfer', adminAuth, adminController.transfer);
router.post('/players/:id/deduct', adminAuth, adminController.deduct);
router.post('/transfer-all', adminAuth, adminController.transferAll);
router.delete('/players/:id', adminAuth, adminController.deletePlayer);

module.exports = router;
