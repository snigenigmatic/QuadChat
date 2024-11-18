const express = require('express');
const { auth } = require('../middleware/auth');
const Room = require('../models/Room');
const Message = require('../models/Message');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Validation rules
const createRoomValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Room name is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Room name must be between 3 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters')
];

const messageValidation = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ max: 1000 })
    .withMessage('Message cannot exceed 1000 characters')
];

// Create a new room
router.post('/rooms', auth, createRoomValidation, validate, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const room = new Room({
      name,
      description,
      participants: [req.user._id],
      createdBy: req.user._id
    });

    await room.save();
    
    res.status(201).json({
      status: 'success',
      data: {
        room: await room.populate([
          { path: 'participants', select: 'name email' },
          { path: 'createdBy', select: 'name email' }
        ])
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Error creating room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all rooms
router.get('/rooms', auth, async (req, res) => {
  try {
    const rooms = await Room.find({ participants: req.user._id })
      .populate('participants', 'name email')
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 });

    res.json({
      status: 'success',
      data: { rooms }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching rooms',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get room by ID
router.get('/rooms/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findOne({
      _id: req.params.roomId,
      participants: req.user._id
    })
    .populate('participants', 'name email')
    .populate('createdBy', 'name email');

    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: 'Room not found'
      });
    }

    res.json({
      status: 'success',
      data: { room }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Join a room
router.post('/rooms/:roomId/join', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: 'Room not found'
      });
    }

    if (!room.participants.includes(req.user._id)) {
      room.participants.push(req.user._id);
      await room.save();
    }

    const populatedRoom = await room.populate([
      { path: 'participants', select: 'name email' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.json({
      status: 'success',
      data: { room: populatedRoom }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Error joining room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Leave a room
router.post('/rooms/:roomId/leave', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: 'Room not found'
      });
    }

    if (room.createdBy.equals(req.user._id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Room creator cannot leave the room'
      });
    }

    room.participants = room.participants.filter(
      participant => !participant.equals(req.user._id)
    );
    await room.save();

    res.json({
      status: 'success',
      message: 'Successfully left the room'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Error leaving room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get room messages
router.get('/rooms/:roomId/messages', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const room = await Room.findOne({
      _id: req.params.roomId,
      participants: req.user._id
    });

    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: 'Room not found'
      });
    }

    const messages = await Message.find({ room: req.params.roomId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', 'name email');

    const total = await Message.countDocuments({ room: req.params.roomId });

    res.json({
      status: 'success',
      data: {
        messages,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Send message to room
router.post('/rooms/:roomId/messages', auth, messageValidation, validate, async (req, res) => {
  try {
    const room = await Room.findOne({
      _id: req.params.roomId,
      participants: req.user._id
    });

    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: 'Room not found'
      });
    }

    const message = new Message({
      content: req.body.content,
      room: req.params.roomId,
      sender: req.user._id,
      messageType: req.body.messageType || 'text',
      fileUrl: req.body.fileUrl,
      fileName: req.body.fileName,
      fileSize: req.body.fileSize
    });

    await message.save();
    
    // Update room's lastMessage and updatedAt
    room.lastMessage = message._id;
    room.updatedAt = new Date();
    await room.save();

    const populatedMessage = await message.populate('sender', 'name email');

    res.status(201).json({
      status: 'success',
      data: { message: populatedMessage }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Error sending message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
