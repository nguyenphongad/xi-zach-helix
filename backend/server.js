const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const adminRoutes = require('./routes/admin');
const socketHandler = require('./middleware/socketHandler');
const Admin = require('./models/Admin');
const bcrypt = require('bcrypt');
const { setIo } = require('./socket');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ["GET", "POST"]
  }
});

// Save io instance for other modules (e.g. controllers)
setIo(io);

// Middleware
app.use(cors());
app.use(express.json());

// Database connection & seed admin
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    const username = process.env.ADMIN_USERNAME || 'admin';
    const plainPassword = process.env.ADMIN_PASSWORD || 'admin123';
    let admin = await Admin.findOne({ username });
    if (!admin) {
      const hashed = await bcrypt.hash(plainPassword, 10);
      admin = await Admin.create({
        username,
        password: hashed,
        balance: 999999999,
      });
      console.log('Admin account created:', username);
    }
  })
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);

// Socket handling
socketHandler(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
