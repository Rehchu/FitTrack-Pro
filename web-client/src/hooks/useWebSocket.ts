import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useNotifications } from './useNotifications';

export function useWebSocket() {
  const socketRef = useRef<Socket>();
  const { token } = useAuthStore();
  const { showNotification } = useNotifications();

  useEffect(() => {
    // Connect to WebSocket when authenticated
    if (token) {
      socketRef.current = io(import.meta.env.VITE_API_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      // Handle connection events
      socketRef.current.on('connect', () => {
        console.log('WebSocket connected');
      });

      socketRef.current.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });

      // Handle incoming messages
      socketRef.current.on('message', (message) => {
        showNotification({
          title: message.from,
          body: message.content,
          type: 'message'
        });
      });

      // Handle incoming video call requests
      socketRef.current.on('videoCall', (call) => {
        showNotification({
          title: 'Incoming Video Call',
          body: `${call.from} is calling...`,
          type: 'videoCall',
          data: call
        });
      });
    }

    // Cleanup on unmount or token change
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token]);

  // Send a message
  const sendMessage = (to: string, content: string) => {
    if (socketRef.current) {
      socketRef.current.emit('message', { to, content });
    }
  };

  // Start a video call
  const startVideoCall = (to: string) => {
    if (socketRef.current) {
      socketRef.current.emit('videoCall', { to });
    }
  };

  return {
    socket: socketRef.current,
    sendMessage,
    startVideoCall,
  };
}