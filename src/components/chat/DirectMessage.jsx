import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { format } from 'date-fns';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { PaperClipIcon, FaceSmileIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

const DirectMessage = ({ recipientId, recipientName }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!socket) return;

    // Load previous messages
    const loadMessages = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${baseUrl}/api/direct-messages/${recipientId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        if (data.status === 'success') {
          setMessages(data.messages);
          scrollToBottom();
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();

    // Socket event listeners
    socket.on('receive_direct_message', handleNewMessage);
    socket.on('typing_status', handleTypingStatus);

    return () => {
      socket.off('receive_direct_message', handleNewMessage);
      socket.off('typing_status', handleTypingStatus);
    };
  }, [socket, recipientId]);

  const handleNewMessage = (newMessage) => {
    setMessages(prev => [...prev, newMessage]);
    scrollToBottom();
    
    // Clear recipient typing status when message is received
    if (newMessage.sender === recipientId) {
      setRecipientTyping(false);
    }
  };

  const handleTypingStatus = ({ userId, status }) => {
    if (userId === recipientId) {
      setRecipientTyping(status);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing_start', { recipient: recipientId });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing_end', { recipient: recipientId });
    }, 2000);
  };

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        alert('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const uploadFile = async () => {
    if (!file) return null;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/uploads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.status === 'success') {
        return {
          fileUrl: data.fileUrl,
          fileName: file.name,
          fileSize: file.size
        };
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    } finally {
      setUploading(false);
      setFile(null);
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!message.trim() && !file) || uploading) return;

    try {
      let fileData = null;
      if (file) {
        fileData = await uploadFile();
      }

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/direct-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          recipient: recipientId,
          content: message.trim(),
          messageType: file ? 'file' : 'text',
          ...(fileData && {
            fileUrl: fileData.fileUrl,
            fileName: fileData.fileName,
            fileSize: fileData.fileSize
          })
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setMessage('');
        setFile(null);
        socket.emit('direct_message', {
          recipient: recipientId,
          content: message.trim(),
          messageType: file ? 'file' : 'text',
          ...(fileData && {
            fileUrl: fileData.fileUrl,
            fileName: fileData.fileName,
            fileSize: fileData.fileSize
          })
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const onEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.sender === user._id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                msg.sender === user._id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {msg.messageType === 'file' ? (
                <div className="space-y-2">
                  <a
                    href={msg.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline flex items-center"
                  >
                    <PaperClipIcon className="h-4 w-4 mr-1" />
                    {msg.fileName}
                  </a>
                  <span className="text-xs opacity-75">
                    {(msg.fileSize / 1024).toFixed(1)} KB
                  </span>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
              <div className="text-xs opacity-75 mt-1">
                {format(new Date(msg.timestamp), 'HH:mm')}
              </div>
            </div>
          </div>
        ))}
        {recipientTyping && (
          <div className="text-sm text-gray-500">
            {recipientName} is typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4 space-y-2">
        {file && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <PaperClipIcon className="h-4 w-4" />
            <span>{file.name}</span>
            <button
              onClick={() => {
                setFile(null);
                fileInputRef.current.value = '';
              }}
              className="text-red-500 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            onInput={handleTyping}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <FaceSmileIcon className="h-6 w-6 text-gray-500" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2">
                <EmojiPicker onEmojiClick={onEmojiClick} />
              </div>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current.click()}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <PaperClipIcon className="h-6 w-6 text-gray-500" />
          </button>

          <button
            onClick={handleSendMessage}
            disabled={(!message.trim() && !file) || uploading}
            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DirectMessage;
