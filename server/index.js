const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { auth } = require('./middleware/auth');
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
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket'],
  allowEIO3: true,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e8 // 100 MB
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

// Socket.IO middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      throw new Error('Authentication token missing');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Attach user to socket
    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handling
io.on('connection', async (socket) => {
  try {
    const { user } = socket;
    console.log(`[Socket ${socket.id}] User connected: ${user.name} (${user._id})`);

    // Add user to connected users map
    connectedUsers.set(user._id.toString(), {
      socketId: socket.id,
      userId: user._id,
      userName: user.name,
      _id: user._id // Add _id for client-side filtering
    });

    // Broadcast updated online users list to all clients
    const onlineUsersList = Array.from(connectedUsers.values()).map(u => ({
      _id: u.userId,
      name: u.userName
    }));
    io.emit('onlineUsers', onlineUsersList);

    // Log connected users
    console.log('[Connected Users]', Array.from(connectedUsers.values()).map(u => u.userName).join(', '));

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Socket ${socket.id}] User disconnected: ${user.name} (${user._id}), reason: ${reason}`);
      connectedUsers.delete(user._id.toString());
      
      // Broadcast updated online users list after disconnect
      const onlineUsersList = Array.from(connectedUsers.values()).map(u => ({
        _id: u.userId,
        name: u.userName
      }));
      io.emit('onlineUsers', onlineUsersList);
      
      console.log('[Connected Users]', Array.from(connectedUsers.values()).map(u => u.userName).join(', '));
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`[Socket ${socket.id}] Error:`, error);
    });

    // Handle new messages
    socket.on('sendMessage', async (messageData, callback) => {
      try {
        const { text, timestamp } = messageData;
        
        // Create and save message
        const message = new Message({
          content: text,
          sender: user._id,
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
    socket.on('send_direct_message', async (messageData, callback) => {
      try {
        const { recipientId, text, timestamp } = messageData;
        console.log(`[Socket ${socket.id}] Sending direct message from ${user.name} to ${recipientId}`);
        
        const recipient = connectedUsers.get(recipientId);
        
        // Create and save direct message
        const directMessage = new DirectMessage({
          content: text,
          sender: user._id,
          recipient: recipientId,
          messageType: 'text',
          createdAt: timestamp || new Date()
        });
        await directMessage.save();
        console.log(`[Socket ${socket.id}] Message saved to database`);

        // Populate sender information
        await directMessage.populate('sender', 'name email');

        const messageResponse = {
          _id: directMessage._id,
          text: directMessage.content,
          sender: directMessage.sender._id,
          recipient: recipientId,
          timestamp: directMessage.createdAt
        };

        // Send to recipient if they're online
        if (recipient) {
          console.log(`[Socket ${socket.id}] Sending message to recipient socket ${recipient.socketId}`);
          socket.to(recipient.socketId).emit('receive_direct_message', {
            message: messageResponse
          });
        }

        // Send confirmation back to sender
        console.log(`[Socket ${socket.id}] Sending confirmation to sender`);
        callback({
          status: 'success',
          data: messageResponse
        });
      } catch (error) {
        console.error(`[Socket ${socket.id}] Error sending direct message:`, error);
        callback({
          status: 'error',
          message: 'Failed to send direct message'
        });
      }
    });

    // Handle typing status for direct messages
    socket.on('typing_direct', ({ recipientId, isTyping }) => {
      console.log(`[Socket ${socket.id}] Typing status from ${user.name} to ${recipientId}: ${isTyping}`);
      try {
        const recipient = connectedUsers.get(recipientId);
        if (recipient) {
          io.to(recipient.socketId).emit('typing_status', {
            userId,
            isTyping
          });
        }
      } catch (error) {
        console.error(`[Socket ${socket.id}] Error handling typing status:`, error);
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
  } catch (error) {
    console.error('[Socket Connection Error]', error);
    socket.disconnect(true);
  }
});

// Initialize general room
initializeGeneralRoom();

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
