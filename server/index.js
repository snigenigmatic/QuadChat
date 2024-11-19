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
const User = require('./models/User');
const Message = require('./models/Message');
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

// Socket.IO event handlers
io.on('connection', async (socket) => {
  const userId = socket.user._id;
  const user = await User.findById(userId).select('name email status');
  
  // Add user to connected users
  connectedUsers.set(userId, {
    socketId: socket.id,
    user: {
      id: userId,
      name: user.name,
      email: user.email
    }
  });

  // Update user status to online
  await User.findByIdAndUpdate(userId, { status: 'online' });

  // Broadcast updated online users list
  const onlineUsers = Array.from(connectedUsers.values()).map(({ user }) => user);
  io.emit('onlineUsers', onlineUsers);

  // Handle new messages
  socket.on('sendMessage', async (messageData, callback) => {
    try {
      const { text, timestamp } = messageData;
      
      // Create and save message
      const message = new Message({
        content: text,
        sender: userId,
        room: 'general', // For now, we'll use a default room
        messageType: 'text',
        createdAt: timestamp
      });
      await message.save();

      // Populate sender information
      await message.populate('sender', 'name email');

      // Broadcast message to all users
      io.emit('message', {
        id: message._id,
        text: message.content,
        sender: {
          id: message.sender._id,
          name: message.sender.name,
          email: message.sender.email
        },
        timestamp: message.createdAt
      });

      // Send confirmation back to sender
      callback({ 
        status: 'success', 
        data: {
          id: message._id,
          text: message.content,
          sender: userId,
          timestamp: message.createdAt
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      callback({ status: 'error', message: 'Failed to send message' });
    }
  });

  // Handle get messages request
  socket.on('getMessages', async (callback) => {
    try {
      // Fetch last 50 messages from the database
      const messages = await Message.find({ room: 'general' })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('sender', 'name email')
        .lean();

      // Format messages
      const formattedMessages = messages.reverse().map(msg => ({
        id: msg._id,
        text: msg.content,
        sender: {
          id: msg.sender._id,
          name: msg.sender.name,
          email: msg.sender.email
        },
        timestamp: msg.createdAt
      }));

      callback({ status: 'success', data: formattedMessages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      callback({ status: 'error', message: 'Failed to fetch messages' });
    }
  });

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
      const recipient = connectedUsers.get(recipientId);
      if (recipient) {
        io.to(recipient.socketId).emit('direct_message', {
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
    const recipient = connectedUsers.get(recipientId);
    if (recipient) {
      io.to(recipient.socketId).emit('typing_status', {
        userId,
        isTyping
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    // Remove user from connected users
    connectedUsers.delete(userId);

    // Update user status to offline
    await User.findByIdAndUpdate(userId, { status: 'offline' });

    // Broadcast updated online users list
    const onlineUsers = Array.from(connectedUsers.values()).map(({ user }) => user);
    io.emit('onlineUsers', onlineUsers);
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

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
});
