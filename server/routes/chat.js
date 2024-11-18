const express = require('express');
const auth = require('../middleware/auth');
const Room = require('../models/Room');
const Message = require('../models/Message');

const router = express.Router();

// Create a new room
router.post('/rooms', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const room = new Room({
      name,
      description,
      participants: [req.user._id],
      createdBy: req.user._id
    });

    await room.save();
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error creating room' });
  }
});

// Get all rooms
router.get('/rooms', auth, async (req, res) => {
  try {
    const rooms = await Room.find({ participants: req.user._id })
      .populate('participants', 'name email')
      .populate('createdBy', 'name email');
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rooms' });
  }
});

// Join a room
router.post('/rooms/:roomId/join', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.participants.includes(req.user._id)) {
      room.participants.push(req.user._id);
      await room.save();
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error joining room' });
  }
});

// Get room messages
router.get('/rooms/:roomId/messages', auth, async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.roomId })
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Send a message
router.post('/rooms/:roomId/messages', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this room' });
    }

    const message = new Message({
      content,
      sender: req.user._id,
      room: room._id
    });

    await message.save();
    
    // Populate sender information before sending response
    await message.populate('sender', 'name email');
    
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Error sending message' });
  }
});

module.exports = router;
