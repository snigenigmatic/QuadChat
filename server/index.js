const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const { Server } = require('socket.io');
const { auth } = require('./middleware/auth');
const socketAuth = require('./middleware/socketAuth');
const { apiLimiter } = require('./middleware/rateLimiter');
const DirectMessage = require('./models/DirectMessage');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const directMessageRoutes = require('./routes/directMessages');
const uploadRoutes = require('./routes/uploads');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5174',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Request logging middleware - MOVED TO TOP
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  next();
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Security middleware
app.use(helmet({
  hsts: false,
  contentSecurityPolicy: false
}));
app.use(morgan('dev')); // Logging
app.use(compression()); // Compression

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', auth, chatRoutes);
app.use('/api/messages', auth, directMessageRoutes);
app.use('/api/uploads', auth, uploadRoutes);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'QuadChat API is running' });
});

// API Routes with rate limiting
app.use('/api', apiLimiter);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Socket authentication middleware
io.use(socketAuth);

// Connected users map
const connectedUsers = new Map();

io.on('connection', async (socket) => {
  const userId = socket.user._id;
  connectedUsers.set(userId, socket.id);
  
  // Notify others that user is online
  socket.broadcast.emit('user_status', { userId, status: 'online' });

  // Handle direct messages
  socket.on('direct_message', async (data) => {
    try {
      const { recipientId, content, type = 'text' } = data;
      
      // Create and save message
      const message = new DirectMessage({
        sender: userId,
        recipient: recipientId,
        content,
        type,
        timestamp: new Date()
      });
      await message.save();

      // Send to recipient if online
      const recipientSocketId = connectedUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('direct_message', {
          messageId: message._id,
          sender: userId,
          content,
          type,
          timestamp: message.timestamp
        });
      }

      // Confirm message sent
      socket.emit('message_sent', { messageId: message._id });
    } catch (error) {
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // Handle typing status
  socket.on('typing', ({ recipientId, isTyping }) => {
    const recipientSocketId = connectedUsers.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('typing_status', {
        userId,
        isTyping
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    connectedUsers.delete(userId);
    socket.broadcast.emit('user_status', { userId, status: 'offline' });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler - must be after all routes
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.method, req.originalUrl);
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
});
