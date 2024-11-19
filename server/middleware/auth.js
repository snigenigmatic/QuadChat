const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid Authorization header format' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Authentication required' 
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.userId).select('+password');

      if (!user) {
        throw new Error('User not found');
      }

      // Check if token exists in user's tokens array
      const tokenExists = user.tokens.some(t => t.token === token);
      if (!tokenExists) {
        throw new Error('Token not found');
      }

      // Check token expiration
      const tokenData = user.tokens.find(t => t.token === token);
      const now = new Date();
      const tokenAge = now - tokenData.createdAt;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

      if (tokenAge > maxAge) {
        // Remove expired token
        user.tokens = user.tokens.filter(t => t.token !== token);
        await user.save();
        throw new Error('Token expired');
      }

      // Attach user and token to request
      req.token = token;
      req.user = user;
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      return res.status(401).json({
        status: 'error',
        message: error.message || 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during authentication'
    });
  }
};

// Optional: Higher-level role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this route'
      });
    }
    next();
  };
};

module.exports = { auth, authorize };
