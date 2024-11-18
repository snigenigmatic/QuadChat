import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Conversations from './Conversations';
import DirectMessage from './DirectMessage';
import { 
  UsersIcon, 
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';

const ChatLayout = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('direct');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSelectConversation = (user) => {
    setSelectedUser(user);
    setSelectedRoom(null);
    setIsMobileMenuOpen(false);
  };

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setSelectedUser(null);
    setIsMobileMenuOpen(false);
  };

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-full bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div 
        className={`
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          fixed md:relative
          w-80 h-full
          bg-white dark:bg-gray-800
          border-r border-gray-200 dark:border-gray-700
          transform transition-transform duration-200 ease-in-out
          z-30 md:z-auto
        `}
      >
        {/* Search and New Chat */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200">
            <PlusIcon className="h-5 w-5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-4 text-center transition-colors duration-200 ${
              activeTab === 'direct'
                ? 'border-b-2 border-blue-500 text-blue-500 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <UsersIcon className="h-5 w-5" />
              <span>Direct</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex-1 py-4 text-center transition-colors duration-200 ${
              activeTab === 'rooms'
                ? 'border-b-2 border-blue-500 text-blue-500 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
              searchQuery={searchQuery}
              onSelectConversation={handleSelectConversation}
              selectedUserId={selectedUser?._id}
            />
          ) : (
            <RoomsList
              searchQuery={searchQuery}
              onSelectRoom={handleSelectRoom}
              selectedRoomId={selectedRoom?._id}
            />
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Mobile menu button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden absolute left-4 top-4 p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>

        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {selectedUser.avatar ? (
                    <img
                      src={selectedUser.avatar}
                      alt={selectedUser.name}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 font-medium text-lg">
                        {selectedUser.name[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    {selectedUser.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedUser.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <DirectMessage
              recipientId={selectedUser._id}
              recipientName={selectedUser.name}
            />
          </>
        ) : selectedRoom ? (
          <>
            {/* Room Header */}
            <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <ChatBubbleLeftRightIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    {selectedRoom.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedRoom.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Room Messages */}
            <RoomMessages room={selectedRoom} currentUser={user} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <ChatBubbleLeftRightIcon className="h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              No conversation selected
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              Choose a conversation from the sidebar or start a new chat to begin messaging
            </p>
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default ChatLayout;
