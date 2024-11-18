const express = require('express');
const auth = require('../middleware/auth');
const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');

const router = express.Router();

// Get conversations list (users you've chatted with)
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await DirectMessage.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { recipient: req.user._id }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', req.user._id] },
              '$recipient',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          user: {
            _id: 1,
            name: 1,
            email: 1
          },
          lastMessage: 1,
          unreadCount: 1
        }
      }
    ]);

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching conversations' });
  }
});

// Get messages with a specific user
router.get('/messages/:userId', auth, async (req, res) => {
  try {
    const messages = await DirectMessage.find({
      $or: [
        { sender: req.user._id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user._id }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('sender', 'name email')
    .populate('recipient', 'name email');

    // Mark messages as read
    await DirectMessage.updateMany(
      {
        recipient: req.user._id,
        sender: req.params.userId,
        read: false
      },
      { read: true }
    );

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Send a direct message
router.post('/messages/:userId', auth, async (req, res) => {
  try {
    const { content, messageType = 'text', fileUrl, fileName, fileSize } = req.body;
    const recipient = await User.findById(req.params.userId);

    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const message = new DirectMessage({
      sender: req.user._id,
      recipient: recipient._id,
      content,
      messageType,
      fileUrl,
      fileName,
      fileSize
    });

    await message.save();
    await message.populate('sender', 'name email');
    await message.populate('recipient', 'name email');

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Get unread message count
router.get('/unread', auth, async (req, res) => {
  try {
    const unreadCount = await DirectMessage.countDocuments({
      recipient: req.user._id,
      read: false
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching unread count' });
  }
});

module.exports = router;
