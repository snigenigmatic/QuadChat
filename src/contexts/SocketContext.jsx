import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      console.log('No user, not connecting socket');
      if (socketRef.current) {
        console.log('Cleaning up existing socket due to user logout');
        socketRef.current.removeAllListeners();
        socketRef.current.close();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    if (socketRef.current?.connected) {
      console.log('Socket already connected, skipping connection');
      return;
    }

    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    console.log('Connecting to socket at:', SOCKET_URL);

    // Socket.IO connection config
    const socket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('token')
      },
      query: {
        userId: currentUser._id,
        userName: currentUser.name
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket reconnection attempt:', attemptNumber);
    });

    socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
      setIsConnected(false);
    });

    socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      setIsConnected(false);
    });

    return () => {
      if (socket && !currentUser) {
        console.log('Cleaning up socket connection on unmount');
        socket.removeAllListeners();
        socket.close();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [currentUser]);

  const cleanupSocket = () => {
    if (socketRef.current) {
      console.log('Manual socket cleanup initiated');
      socketRef.current.removeAllListeners();
      socketRef.current.close();
      socketRef.current = null;
      setIsConnected(false);
    }
  };

  return (
    <SocketContext.Provider value={{ 
      socket: socketRef.current, 
      cleanupSocket,
      isConnected 
    }}>
      {children}
    </SocketContext.Provider>
  );
};
