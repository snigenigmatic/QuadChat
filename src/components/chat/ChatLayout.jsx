import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Conversations from './Conversations';
import DirectMessage from './DirectMessage';
import { UsersIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

const ChatLayout = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' or 'rooms'
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const handleSelectConversation = (user) => {
    setSelectedUser(user);
    setSelectedRoom(null);
  };

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setSelectedUser(null);
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col">
        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-4 text-center ${
              activeTab === 'direct'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-500'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <UsersIcon className="h-5 w-5" />
              <span>Direct</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex-1 py-4 text-center ${
              activeTab === 'rooms'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-500'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
              <span>Rooms</span>
            </div>
          </button>
        </div>

        {/* Conversations or Rooms List */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'direct' ? (
            <Conversations
              currentUser={user}
              onSelectConversation={handleSelectConversation}
            />
          ) : (
            <RoomsList onSelectRoom={handleSelectRoom} />
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b">
              <h2 className="font-medium">{selectedUser.name}</h2>
              <p className="text-sm text-gray-500">{selectedUser.email}</p>
            </div>

            {/* Chat Messages */}
            <DirectMessage
              recipientId={selectedUser._id}
              currentUser={user}
            />
          </>
        ) : selectedRoom ? (
          <>
            {/* Room Header */}
            <div className="p-4 border-b">
              <h2 className="font-medium">{selectedRoom.name}</h2>
              <p className="text-sm text-gray-500">{selectedRoom.description}</p>
            </div>

            {/* Room Messages */}
            <RoomMessages room={selectedRoom} currentUser={user} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation or room to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatLayout;
