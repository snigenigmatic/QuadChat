import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

// Create a single socket instance outside the component
let globalSocket = null;

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { currentUser: user } = useAuth();
  const token = localStorage.getItem('token');
  const socketInitialized = useRef(false);

  const initializeSocket = () => {
    if (!user || !token || socketInitialized.current || globalSocket) {
      return;
    }

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    console.log('Initializing socket connection...');

    globalSocket = io(baseUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    globalSocket.on('connect', () => {
      console.log('Socket connected successfully');
      setSocket(globalSocket);
      socketInitialized.current = true;
    });

    globalSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      if (error.message.includes('Authentication error')) {
        console.error('Socket authentication failed');
        cleanupSocket();
      }
    });

    globalSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        cleanupSocket();
      }
    });
  };

  const cleanupSocket = () => {
    if (globalSocket) {
      console.log('Cleaning up socket connection');
      globalSocket.disconnect();
      globalSocket = null;
      setSocket(null);
      socketInitialized.current = false;
    }
  };

  useEffect(() => {
    if (user && token) {
      initializeSocket();
    } else {
      cleanupSocket();
    }

    return () => {
      if (!user || !token) {
        cleanupSocket();
      }
    };
  }, [user, token]);

  return (
    <SocketContext.Provider value={{ socket, cleanupSocket }}>
      {children}
    </SocketContext.Provider>
  );
};
