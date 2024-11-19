import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { currentUser: user } = useAuth();
  const token = localStorage.getItem('token');
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user || !token) {
      console.log('No user or token available, not connecting socket');
      if (socketRef.current) {
        console.log('Disconnecting existing socket');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Only create a new socket if one doesn't exist
    if (!socketRef.current) {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log('Creating new socket connection to:', baseUrl);

      socketRef.current = io(baseUrl, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected successfully');
        setSocket(socketRef.current);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        if (error.message.includes('Authentication error')) {
          console.error('Socket authentication failed');
          socketRef.current.disconnect();
          socketRef.current = null;
          setSocket(null);
        }
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, clean up
          socketRef.current = null;
          setSocket(null);
        }
      });
    }

    // Cleanup function
    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [user, token]); // Only re-run if user or token changes

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
