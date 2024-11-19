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
const Room = require('./models/Room');
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

// Store connected users and general room ID
const connectedUsers = new Map();
let generalRoomId;

// Initialize general room
const initializeGeneralRoom = async () => {
  try {
    let generalRoom = await Room.findOne({ name: 'general' });
    if (!generalRoom) {
      // Create the general room if it doesn't exist
      const systemUser = await User.findOne({ email: 'system@quadchat.com' });
      let creatorId;
      
      if (!systemUser) {
        // Create system user if it doesn't exist
        const systemUser = new User({
          name: 'System',
          email: 'system@quadchat.com',
          password: require('crypto').randomBytes(32).toString('hex'),
          status: 'online'
        });
        await systemUser.save();
        creatorId = systemUser._id;
      } else {
        creatorId = systemUser._id;
      }

      generalRoom = new Room({
        name: 'general',
        description: 'General chat room for all users',
        createdBy: creatorId,
        participants: [creatorId]
      });
      await generalRoom.save();
    }
    generalRoomId = generalRoom._id;
    console.log('General room initialized with ID:', generalRoomId);
  } catch (error) {
    console.error('Error initializing general room:', error);
  }
};

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
app.use('/api/direct-messages', auth, directMessageRoutes);
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

// Initialize general room
initializeGeneralRoom();

// Socket.IO event handlers
io.on('connection', async (socket) => {
  const userId = socket.user._id;
  const user = await User.findById(userId).select('name email status');
  
  console.log(` User connected: ${user.name} (${userId})`);
  
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

  // Add user to general room if not already a participant
  if (generalRoomId) {
    const generalRoom = await Room.findById(generalRoomId);
    if (generalRoom && !generalRoom.participants.includes(userId)) {
      generalRoom.participants.push(userId);
      await generalRoom.save();
    }
  }

  // Broadcast updated online users list
  const onlineUsers = Array.from(connectedUsers.values()).map(({ user }) => user);
  console.log(' Current online users:', onlineUsers.map(u => u.name).join(', '));
  io.emit('onlineUsers', onlineUsers);

  // Handle new messages
  socket.on('sendMessage', async (messageData, callback) => {
    try {
      const { text, timestamp } = messageData;
      
      // Create and save message
      const message = new Message({
        content: text,
        sender: userId,
        room: generalRoomId, // Use the general room ID
        messageType: 'text',
        createdAt: timestamp
      });
      await message.save();

      // Populate sender information
      await message.populate('sender', 'name email');

      // Broadcast message to all users
      io.emit('message', {
        _id: message._id,
        text: message.content,
        sender: {
          _id: message.sender._id,
          name: message.sender.name,
          email: message.sender.email
        },
        timestamp: message.createdAt
      });

      // Send confirmation back to sender
      callback({ 
        status: 'success', 
        data: {
          _id: message._id,
          text: message.content,
          sender: {
            _id: message.sender._id,
            name: message.sender.name,
            email: message.sender.email
          },
          timestamp: message.createdAt
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      callback({ status: 'error', message: 'Failed to send message' });
    }
  });

  // Handle message history request
  socket.on('getMessages', async (callback) => {
    try {
      const messages = await Message.find({ room: generalRoomId })
        .sort({ createdAt: 1 })
        .populate('sender', 'name email')
        .lean();

      callback({
        status: 'success',
        data: messages.map(msg => ({
          _id: msg._id,
          text: msg.content,
          sender: {
            _id: msg.sender._id,
            name: msg.sender.name,
            email: msg.sender.email
          },
          timestamp: msg.createdAt
        }))
      });
    } catch (error) {
      console.error('Error getting messages:', error);
      callback({ status: 'error', message: 'Failed to get messages' });
    }
  });

  // Handle direct messages
  socket.on('direct_message', async (messageData) => {
    try {
      const { content, recipient, messageType, fileUrl, fileName, fileSize } = messageData;
      
      // Create new direct message
      const newMessage = new DirectMessage({
        sender: userId,
        recipient,
        content,
        messageType,
        fileUrl,
        fileName,
        fileSize
      });

      await newMessage.save();

      // Populate sender info
      await newMessage.populate('sender', 'name email');

      // Send message to recipient if they're online
      const recipientSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.user._id.toString() === recipient);

      if (recipientSocket) {
        recipientSocket.emit('receive_direct_message', {
          message: newMessage,
          sender: user
        });
      }

      // Send acknowledgment back to sender
      socket.emit('message_sent', {
        status: 'success',
        message: 'Message sent successfully',
        data: newMessage
      });
    } catch (error) {
      console.error('Error sending direct message:', error);
      socket.emit('message_error', {
        status: 'error',
        message: 'Failed to send message'
      });
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
    console.log(` User disconnected: ${user.name} (${userId})`);
    connectedUsers.delete(userId);
    await User.findByIdAndUpdate(userId, { status: 'offline' });
    
    // Broadcast updated online users list
    const updatedOnlineUsers = Array.from(connectedUsers.values()).map(({ user }) => user);
    console.log(' Current online users:', updatedOnlineUsers.map(u => u.name).join(', '));
    io.emit('onlineUsers', updatedOnlineUsers);
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
