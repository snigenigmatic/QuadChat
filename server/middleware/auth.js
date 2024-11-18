const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
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
      }).select('-password');

      if (!user) {
        throw new Error();
      }

      // Check token expiration
      const tokenData = user.tokens.find(t => t.token === token);
      if (tokenData && tokenData.expiresAt < new Date()) {
        await User.updateOne(
          { _id: user._id },
          { $pull: { tokens: { token } } }
        );
        throw new Error('Token expired');
      }

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
        message: 'Access forbidden' 
      });
    }

    next();
  };
};

module.exports = { auth, authorize };
