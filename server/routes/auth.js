const express = require('express');
const bcrypt = require('bcryptjs');
const { validateRegistration, validateLogin, validate } = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Auth API is working' });
});

// Register
router.post('/register', validateRegistration, validate, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    console.log('Registration attempt for:', email);

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is already registered'
      });
    }

    // Create user - password will be hashed by the pre-save hook
    const user = new User({ 
      email, 
      password, 
      name,
      status: 'online'
    });
    await user.save();

    // Generate token
    const token = await user.generateAuthToken();

    // Send response
    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          status: user.status
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// Login
router.post('/login', validateLogin, validate, async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    // Get user with password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Update user status
    user.status = 'online';
    await user.save();

    // Generate token
    const token = await user.generateAuthToken();

    // Send response
    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          status: user.status
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      status: 'success',
      data: {
        user: {
          id: req.user._id,
          email: req.user.email,
          name: req.user.name,
          status: req.user.status
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user data',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// Logout
router.post('/logout', auth, async (req, res) => {
  try {
    // Update user status
    req.user.status = 'offline';
    await req.user.save();

    // Remove current token
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { tokens: { token: req.token } } }
    );

    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error logging out',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// Logout from all devices
router.post('/logout-all', auth, async (req, res) => {
  try {
    // Update user status
    req.user.status = 'offline';
    await req.user.save();

    // Remove all tokens
    await User.updateOne(
      { _id: req.user._id },
      { $set: { tokens: [] } }
    );

    res.json({
      status: 'success',
      message: 'Logged out from all devices'
    });
  } catch (error) {
    console.error('Error logging out from all devices:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error logging out from all devices',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// Get online users
router.get('/online-users', auth, async (req, res) => {
  try {
    const onlineUsers = await User.find(
      { status: 'online', _id: { $ne: req.user._id } },
      { password: 0, tokens: 0 }
    );
    
    res.json({
      status: 'success',
      data: { users: onlineUsers }
    });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching online users'
    });
  }
});

// Update user status
router.put('/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status
    const validStatuses = ['online', 'offline', 'away'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status'
      });
    }

    // Update user status
    const user = req.user;
    user.status = status;
    await user.save();

    res.json({
      status: 'success',
      data: {
        status: user.status
      }
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating status',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

module.exports = router;
