import { useEffect, useRef, useState } from 'react';
import { Button, IconButton, TextField, Box, Typography } from '@mui/material';
import { Send, VideoCall as VideoCallIcon } from '@mui/icons-material';
import { useWebSocket } from '../hooks/useWebSocket';
import { format } from 'date-fns';
import { LottieAnimation } from './common/LottieAnimation';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  sentAt: string;
  isRead: boolean;
}

interface ChatProps {
  recipientId: string;
  recipientName: string;
  onStartVideoCall: () => void;
}

export function Chat({ recipientId, recipientName, onStartVideoCall }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { socket, sendMessage } = useWebSocket();

  useEffect(() => {
    // Load chat history
    fetch(`/api/messages/${recipientId}`)
      .then(res => res.json())
      .then(data => setMessages(data));

    // Listen for new messages
    socket?.on('message', (message: Message) => {
      if (message.senderId === recipientId || message.receiverId === recipientId) {
        setMessages(prev => [...prev, message]);
      }
    });

    return () => {
      socket?.off('message');
    };
  }, [recipientId, socket]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      sendMessage(recipientId, newMessage);
      setNewMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Chat header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <h2 className="text-lg font-semibold dark:text-white">{recipientName}</h2>
        <IconButton
          onClick={onStartVideoCall}
          className="text-blue-500 hover:text-blue-600"
          aria-label="Start video call"
        >
          <VideoCallIcon />
        </IconButton>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
            <LottieAnimation 
              animationPath="/animations/chatbot.json" 
              width={200} 
              height={200} 
            />
            <Typography variant="body1" color="textSecondary" sx={{ mt: 2 }}>
              Start a conversation with {recipientName}
            </Typography>
          </Box>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col max-w-[70%] ${
                message.senderId === recipientId ? 'mr-auto' : 'ml-auto'
              }`}
            >
              <div
                className={`rounded-lg p-3 ${
                  message.senderId === recipientId
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'bg-blue-500 text-white'
                }`}
              >
                {message.content}
              </div>
              <span className="text-xs text-gray-500 mt-1">
                {format(new Date(message.sentAt), 'HH:mm')}
                {message.senderId !== recipientId && (
                  <span className="ml-2">
                    {message.isRead ? '✓✓' : '✓'}
                  </span>
                )}
              </span>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Message input */}
      <div className="p-4 border-t dark:border-gray-700">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex space-x-2"
        >
          <TextField
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            fullWidth
            variant="outlined"
            size="small"
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            endIcon={<Send />}
            disabled={!newMessage.trim()}
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}