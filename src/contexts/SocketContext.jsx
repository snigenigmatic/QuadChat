import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Connect to the Socket.IO server
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      // Set up event listeners
      newSocket.on('connect', () => {
        console.log('Connected to Socket.IO server');
        // Join user's personal room for direct messages
        newSocket.emit('join_user', user._id);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from Socket.IO server');
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
