const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },
  tokens: [{
    token: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 10);
  }
  next();
});

// Generate auth token
userSchema.methods.generateAuthToken = async function() {
  const user = this;
  
  // Create token
  const token = jwt.sign(
    { 
      userId: user._id.toString(),
      email: user.email 
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Add token to user's tokens array
  user.tokens = user.tokens.concat({ 
    token,
    createdAt: new Date()
  });
  
  await user.save();
  return token;
};

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  const user = this;
  return bcrypt.compare(candidatePassword, user.password);
};

// Clean up expired tokens
userSchema.methods.cleanExpiredTokens = async function() {
  const user = this;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  user.tokens = user.tokens.filter(token => token.createdAt > sevenDaysAgo);
  await user.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;
