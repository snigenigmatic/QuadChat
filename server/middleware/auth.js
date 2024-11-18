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

      const user = await User.findOne({ 
        _id: decoded.userId,
        'tokens.token': token 
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check token age
      const tokenData = user.tokens.find(t => t.token === token);
      if (!tokenData) {
        throw new Error('Token not found');
      }

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      if (tokenData.createdAt < sevenDaysAgo) {
        // Remove expired token
        await User.updateOne(
          { _id: user._id },
          { $pull: { tokens: { token } } }
        );
        throw new Error('Token expired');
      }

      // Clean up old tokens
      await User.updateOne(
        { _id: user._id },
        { $pull: { tokens: { createdAt: { $lt: sevenDaysAgo } } } }
      );

      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      return res.status(401).json({ 
        status: 'error',
        message: error.message === 'Token expired' 
          ? 'Session expired, please login again'
          : 'Invalid authentication token'
      });
    }
  } catch (error) {
    console.error('Auth Middleware - Server error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Server error during authentication'
    });
  }
};

// Optional: Higher-level role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this resource'
      });
    }

    next();
  };
};

module.exports = { auth, authorize };
