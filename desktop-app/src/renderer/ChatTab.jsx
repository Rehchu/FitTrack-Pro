import React, { useEffect, useState, useRef } from 'react';

/**
 * Real-time Chat Component using Cloudflare Durable Objects
 * Connects to /chat/:roomId endpoint on the Worker
 */
export function ChatTab({ client, apiBase }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const roomId = `client-${client.id}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Convert HTTP(S) to WS(S) for WebSocket connection
    const wsUrl = apiBase
      .replace('https://', 'wss://')
      .replace('http://', 'ws://')
      .replace('/api', '') + `/chat/${roomId}`;

    console.log('Connecting to chat:', wsUrl);
    
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('Chat connected');
      setConnected(true);
      // Request message history
      websocket.send(JSON.stringify({
        type: 'getHistory',
        limit: 50
      }));
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Chat message:', data);
      
      if (data.type === 'history') {
        setMessages(data.messages || []);
      } else if (data.type === 'message') {
        setMessages(prev => [...prev, data]);
      } else if (data.type === 'error') {
        console.error('Chat error:', data.message);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    websocket.onclose = () => {
      console.log('Chat disconnected');
      setConnected(false);
    };

    setWs(websocket);

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [client.id, apiBase, roomId]);

  const sendMessage = () => {
    if (!newMessage.trim() || !ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'message',
      user: 'Trainer',
      text: newMessage.trim(),
      timestamp: Date.now()
    };

    ws.send(JSON.stringify(message));
    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '600px', background: '#2a2f42', borderRadius: 8, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: '#FFB82B' }}>💬 Chat with {client.name}</h3>
        <div style={{ 
          padding: '6px 12px', 
          borderRadius: 20, 
          background: connected ? '#1BB55C22' : '#FF4B3922',
          color: connected ? '#1BB55C' : '#FF4B39',
          fontSize: 13,
          fontWeight: 'bold'
        }}>
          {connected ? '● Connected' : '○ Disconnected'}
        </div>
      </div>

      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        background: '#1a1d2e', 
        borderRadius: 8, 
        padding: 16,
        marginBottom: 16
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: 40 }}>
            <p>No messages yet</p>
            <p style={{ fontSize: 13 }}>Start the conversation!</p>
          </div>
        )}
        
        {messages.map((msg, idx) => {
          const isTrainer = msg.user === 'Trainer' || msg.sender === 'trainer';
          return (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                justifyContent: isTrainer ? 'flex-end' : 'flex-start',
                marginBottom: 12
              }}
            >
              <div style={{
                maxWidth: '70%',
                background: isTrainer ? '#FF4B39' : '#2a2f42',
                color: isTrainer ? 'white' : '#e5e7eb',
                padding: '10px 14px',
                borderRadius: 12,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>
                  {msg.user || msg.sender} • {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
                <div style={{ fontSize: 14 }}>{msg.text || msg.message}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={!connected}
          style={{ 
            flex: 1, 
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid #3a3f52',
            background: '#1a1d2e',
            color: '#e5e7eb',
            fontSize: 14
          }}
        />
        <button 
          onClick={sendMessage}
          disabled={!connected || !newMessage.trim()}
          className="btn-primary"
          style={{ 
            padding: '12px 24px',
            opacity: (!connected || !newMessage.trim()) ? 0.5 : 1
          }}
        >
          Send
        </button>
      </div>

      {!connected && (
        <div style={{ 
          marginTop: 12, 
          padding: 12, 
          background: '#FF4B3922', 
          color: '#FF4B39', 
          borderRadius: 8,
          fontSize: 13
        }}>
          ⚠️ Connecting to chat server... If this persists, check your internet connection.
        </div>
      )}
    </div>
  );
}
