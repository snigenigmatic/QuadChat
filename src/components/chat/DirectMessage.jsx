import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import EmojiPicker from 'emoji-picker-react';
import { PaperClipIcon, FaceSmileIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const DirectMessage = ({ recipientId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socket = useSocket();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadMessages();
    socket.emit('join_user', currentUser._id);

    socket.on('receive_direct_message', (message) => {
      if (
        (message.sender === currentUser._id && message.recipient === recipientId) ||
        (message.sender === recipientId && message.recipient === currentUser._id)
      ) {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      }
    });

    return () => {
      socket.off('receive_direct_message');
    };
  }, [recipientId, currentUser._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/direct/messages/${recipientId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(`/api/direct/messages/${recipientId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: newMessage,
          messageType: 'text'
        })
      });

      const message = await response.json();
      socket.emit('send_direct_message', message);
      setNewMessage('');
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsLoading(true);
    try {
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const { fileUrl, fileName, fileSize } = await uploadResponse.json();

      const messageResponse = await fetch(`/api/direct/messages/${recipientId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: fileUrl,
          messageType: 'file',
          fileName,
          fileSize
        })
      });

      const message = await messageResponse.json();
      socket.emit('send_direct_message', message);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
    setIsLoading(false);
  };

  const onEmojiClick = async (emojiObject) => {
    try {
      const response = await fetch(`/api/direct/messages/${recipientId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: emojiObject.emoji,
          messageType: 'emoji'
        })
      });

      const message = await response.json();
      socket.emit('send_direct_message', message);
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending emoji:', error);
    }
  };

  const renderMessage = (message) => {
    const isCurrentUser = message.sender._id === currentUser._id;
    const messageClass = isCurrentUser ? 'ml-auto bg-blue-500 text-white' : 'bg-gray-200';

    return (
      <div
        key={message._id}
        className={`max-w-[70%] rounded-lg p-3 mb-2 ${messageClass}`}
      >
        {message.messageType === 'file' ? (
          <div className="flex flex-col">
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              📎 {message.fileName}
            </a>
            <span className="text-sm text-gray-500">
              {formatFileSize(message.fileSize)}
            </span>
          </div>
        ) : (
          <p>{message.content}</p>
        )}
        <div className="text-xs text-gray-500 mt-1">
          {format(new Date(message.createdAt), 'HH:mm')}
        </div>
      </div>
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-gray-100 rounded-full"
            disabled={isLoading}
          >
            <PaperClipIcon className="h-6 w-6 text-gray-500" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <FaceSmileIcon className="h-6 w-6 text-gray-500" />
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            disabled={!newMessage.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        </form>

        {showEmojiPicker && (
          <div className="absolute bottom-20 right-4">
            <EmojiPicker onEmojiClick={onEmojiClick} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectMessage;
