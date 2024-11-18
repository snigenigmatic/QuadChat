const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const directMessageRoutes = require('./routes/directMessages');
const uploadRoutes = require('./routes/uploads');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/direct', directMessageRoutes);
app.use('/api/upload', uploadRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user's personal room for direct messages
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${socket.id} joined personal room ${userId}`);
  });

  // Join chat room
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Leave chat room
  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${roomId}`);
  });

  // Handle room messages
  socket.on('send_message', (message) => {
    io.to(message.room).emit('receive_message', message);
  });

  // Handle direct messages
  socket.on('send_direct_message', (message) => {
    // Emit to sender and recipient
    io.to(`user_${message.sender}`).to(`user_${message.recipient}`).emit('receive_direct_message', message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
