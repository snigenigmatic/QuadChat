const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const { auth } = require('./middleware/auth');
const { apiLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const directMessageRoutes = require('./routes/directMessages');
const uploadRoutes = require('./routes/uploads');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

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
  origin: 'http://localhost:5174',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Security middleware
app.use(helmet());
app.use(morgan('dev')); // Logging
app.use(compression()); // Compression

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'QuadChat API is running' });
});

// API Routes with rate limiting
app.use('/api', apiLimiter);

// Mount routes BEFORE the 404 handler
console.log('Mounting auth routes...');
app.use('/api/auth', authRoutes);
console.log('Mounting chat routes...');
app.use('/api/chat', auth, chatRoutes);
console.log('Mounting direct message routes...');
app.use('/api/direct', auth, directMessageRoutes);
console.log('Mounting upload routes...');
app.use('/api/uploads', auth, uploadRoutes);

// Debug: Print all registered routes
console.log('\nRegistered Routes:');
const printRoutes = (stack, parent = '') => {
  stack.forEach(mw => {
    if (mw.route) { // routes
      const methods = Object.keys(mw.route.methods).join(',');
      console.log(`${methods.toUpperCase()} ${parent}${mw.route.path}`);
    } else if (mw.name === 'router') { // middleware
      printRoutes(mw.handle.stack, parent + mw.regexp.source.replace("^\\", "").replace("\\/?(?=\\/|$)", ""));
    }
  });
};
printRoutes(app._router.stack);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
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
