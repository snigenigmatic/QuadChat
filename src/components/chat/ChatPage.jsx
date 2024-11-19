import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from '../shared/ThemeToggle';
import DirectMessage from './DirectMessage';

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [chatType, setChatType] = useState('room'); // 'room' or 'direct'
  const [selectedUser, setSelectedUser] = useState(null);
  const { socket, cleanupSocket } = useSocket();
  const { currentUser: user, logout } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    if (!socket) return;

    // Socket connection status
    socket.on('connect', () => {
      console.log('🔌 Connected to server');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
    });

    // Listen for new messages
    socket.on('message', (message) => {
      console.log('📨 Received message:', message);
      setMessages(prevMessages => [...prevMessages, message]);
      scrollToBottom();
    });

    // Listen for online users updates
    socket.on('onlineUsers', (users) => {
      console.log('👥 Online users updated:', users);
      if (Array.isArray(users)) {
        const filteredUsers = users.filter(u => u.id !== user?._id);
        console.log('Filtered online users:', filteredUsers);
        setOnlineUsers(filteredUsers);
      }
    });

    // Load message history
    socket.emit('getMessages', (response) => {
      console.log('📜 Loading message history:', response);
      if (response.status === 'success') {
        setMessages(response.data);
        scrollToBottom();
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('message');
      socket.off('onlineUsers');
    };
  }, [socket, user]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    console.log('📤 Sending message:', newMessage);
    const messageData = {
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    socket.emit('sendMessage', messageData, (response) => {
      if (response.status === 'success') {
        console.log('✅ Message sent successfully:', response.data);
      } else {
        console.error('❌ Error sending message:', response.message);
      }
    });

    setNewMessage('');
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOwnMessage = (senderId) => senderId === user?._id;

  const handleUserSelect = (selectedUser) => {
    setSelectedUser(selectedUser);
    setChatType('direct');
  };

  const handleChatTypeChange = (type) => {
    setChatType(type);
    setSelectedUser(null);
  };

  const handleLogout = async () => {
    try {
      // First cleanup socket connection
      cleanupSocket();
      // Then logout from auth
      await logout();
      // Finally navigate to auth page
      navigate('/auth');
    } catch (error) {
      console.error('Error during logout:', error);
      // Still try to navigate even if there's an error
      navigate('/auth');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Online Users */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700 hidden md:block">
        <div className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Chat Type</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => handleChatTypeChange('room')}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  chatType === 'room'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Chat Room
              </button>
              <button
                onClick={() => handleChatTypeChange('direct')}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  chatType === 'direct'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Direct Messages
              </button>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Online Users</h2>
          <div className="space-y-2">
            {onlineUsers.length > 0 ? (
              onlineUsers.map((onlineUser) => (
                <div
                  key={onlineUser.id}
                  className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer ${
                    selectedUser?.id === onlineUser.id
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => handleUserSelect(onlineUser)}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-white font-medium">
                    {getInitials(onlineUser.name)}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{onlineUser.name}</span>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Online</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">No users online</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-md px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {chatType === 'direct' && selectedUser 
                  ? `Chat with ${selectedUser.name}`
                  : 'QuadChat Room'}
              </h1>
              <span className="text-sm px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-full">
                {onlineUsers.length + 1} Online
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Chat Content */}
        {chatType === 'direct' && selectedUser ? (
          <DirectMessage
            recipientId={selectedUser.id}
            recipientName={selectedUser.name}
          />
        ) : (
          <>
            {/* Chat Room Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((message, index) => {
                  const isOwn = isOwnMessage(message.sender._id);
                  const showAvatar = !isOwn && (!messages[index - 1] || messages[index - 1].sender._id !== message.sender._id);

                  return (
                    <div
                      key={message._id}
                      className={`flex items-end space-x-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isOwn && showAvatar && (
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-white font-medium">
                          {getInitials(message.sender.name)}
                        </div>
                      )}
                      <div className={`flex flex-col ${!isOwn && !showAvatar ? 'ml-10' : ''}`}>
                        {showAvatar && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
                            {message.sender.name}
                          </span>
                        )}
                        <div
                          className={`max-w-sm lg:max-w-2xl px-4 py-2 rounded-lg ${
                            isOwn
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                          }`}
                        >
                          <p className="text-sm sm:text-base whitespace-pre-wrap break-words">{message.text}</p>
                        </div>
                        <span className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-lg">No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Input */}
            <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-4">
              <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
