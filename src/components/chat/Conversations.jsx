import React, { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { format } from 'date-fns';

const Conversations = ({ currentUser, onSelectConversation }) => {
  const [conversations, setConversations] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const socket = useSocket();

  useEffect(() => {
    loadConversations();
    loadUnreadCounts();

    socket.on('receive_direct_message', (message) => {
      if (message.recipient === currentUser._id) {
        loadUnreadCounts();
        loadConversations();
      }
    });

    return () => {
      socket.off('receive_direct_message');
    };
  }, [currentUser._id]);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/direct/conversations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadUnreadCounts = async () => {
    try {
      const response = await fetch('/api/direct/unread', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setUnreadCounts(data);
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  };

  const getLastMessagePreview = (message) => {
    if (!message) return '';
    
    switch (message.messageType) {
      case 'file':
        return `📎 ${message.fileName}`;
      case 'emoji':
        return message.content;
      default:
        return message.content.length > 30
          ? message.content.substring(0, 30) + '...'
          : message.content;
    }
  };

  return (
    <div className="divide-y">
      {conversations.map((conversation) => (
        <div
          key={conversation.user._id}
          onClick={() => onSelectConversation(conversation.user)}
          className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-medium">{conversation.user.name}</h3>
              <p className="text-sm text-gray-500">
                {getLastMessagePreview(conversation.lastMessage)}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500">
                {conversation.lastMessage
                  ? format(new Date(conversation.lastMessage.createdAt), 'HH:mm')
                  : ''}
              </span>
              {unreadCounts[conversation.user._id] > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 mt-1">
                  {unreadCounts[conversation.user._id]}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Conversations;
