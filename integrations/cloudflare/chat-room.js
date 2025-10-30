/**
 * ChatRoom Durable Object
 * 
 * Provides real-time WebSocket-based chat between trainer and client.
 * Each trainer-client pair gets a unique Durable Object instance.
 * 
 * Features:
 * - Persistent message storage
 * - Real-time message broadcasting
 * - Read receipts
 * - Typing indicators
 * - Message history
 * 
 * Usage:
 * - Room ID format: "trainer_{trainerId}_client_{clientId}"
 * - WebSocket URL: wss://worker-url/chat/{roomId}?userId={id}&userName={name}
 */

export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // userId -> { ws, userName, lastSeen }
  }

  async fetch(request) {
    const url = new URL(request.url);

    // WebSocket upgrade for real-time chat
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // REST API endpoints for chat management

    // GET /chat/{roomId}/messages - Get message history
    if (request.method === 'GET' && url.pathname.endsWith('/messages')) {
      const messages = await this.getMessages();
      return jsonResponse({ messages, total: messages.length });
    }

    // GET /chat/{roomId}/history?before={timestamp}&limit={n}
    if (request.method === 'GET' && url.pathname.endsWith('/history')) {
      const before = parseInt(url.searchParams.get('before')) || Date.now();
      const limit = parseInt(url.searchParams.get('limit')) || 50;
      const messages = await this.getMessagesBefore(before, limit);
      return jsonResponse({ messages });
    }

    // POST /chat/{roomId}/messages - Send message (REST fallback)
    if (request.method === 'POST' && url.pathname.endsWith('/messages')) {
      const { userId, userName, content } = await request.json();
      const message = await this.storeMessage(userId, userName, content);
      
      // Broadcast to all connected clients
      this.broadcastMessage(message);
      
      return jsonResponse({ success: true, message });
    }

    // DELETE /chat/{roomId}/messages/{messageId} - Delete message
    if (request.method === 'DELETE' && url.pathname.includes('/messages/')) {
      const messageId = parseInt(url.pathname.split('/').pop());
      await this.deleteMessage(messageId);
      
      // Broadcast deletion
      this.broadcast({
        type: 'message_deleted',
        messageId,
        timestamp: Date.now()
      });
      
      return jsonResponse({ success: true });
    }

    // PUT /chat/{roomId}/read - Mark messages as read
    if (request.method === 'PUT' && url.pathname.endsWith('/read')) {
      const { userId, lastReadTimestamp } = await request.json();
      await this.markAsRead(userId, lastReadTimestamp);
      
      // Notify other party
      this.broadcast({
        type: 'read_receipt',
        userId,
        timestamp: lastReadTimestamp
      });
      
      return jsonResponse({ success: true });
    }

    // GET /chat/{roomId}/status - Get room status
    if (request.method === 'GET' && url.pathname.endsWith('/status')) {
      const messages = await this.getMessages();
      const activeSessions = Array.from(this.sessions.values()).map(s => ({
        userName: s.userName,
        lastSeen: s.lastSeen
      }));
      
      return jsonResponse({
        totalMessages: messages.length,
        activeSessions: activeSessions.length,
        connectedUsers: activeSessions
      });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }

  async handleWebSocket(request) {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const userName = url.searchParams.get('userName');

    if (!userId || !userName) {
      return new Response('Missing userId or userName', { status: 400 });
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept WebSocket connection
    this.state.acceptWebSocket(server);

    // Store session
    this.sessions.set(userId, {
      ws: server,
      userName,
      lastSeen: Date.now()
    });

    // Send message history to newly connected client
    const messages = await this.getMessages();
    server.send(JSON.stringify({
      type: 'history',
      messages: messages.slice(-50) // Last 50 messages
    }));

    // Notify others that user joined
    this.broadcast({
      type: 'user_joined',
      userId,
      userName,
      timestamp: Date.now()
    }, [userId]); // Exclude sender

    // Handle incoming messages
    server.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'message':
            const message = await this.storeMessage(userId, userName, data.content);
            this.broadcastMessage(message);
            break;

          case 'typing':
            // Broadcast typing indicator (don't store)
            this.broadcast({
              type: 'typing',
              userId,
              userName,
              isTyping: data.isTyping
            }, [userId]);
            break;

          case 'read_receipt':
            await this.markAsRead(userId, data.timestamp);
            this.broadcast({
              type: 'read_receipt',
              userId,
              timestamp: data.timestamp
            }, [userId]);
            break;

          default:
            console.warn('Unknown message type:', data.type);
        }

        // Update last seen
        const session = this.sessions.get(userId);
        if (session) {
          session.lastSeen = Date.now();
        }

      } catch (error) {
        console.error('WebSocket message error:', error);
        server.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    });

    // Handle disconnection
    server.addEventListener('close', () => {
      this.sessions.delete(userId);
      
      // Notify others that user left
      this.broadcast({
        type: 'user_left',
        userId,
        userName,
        timestamp: Date.now()
      });
    });

    // Return the client side of the WebSocket pair
    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  // ==================== MESSAGE STORAGE ====================

  async getMessages() {
    const messages = await this.state.storage.get('messages');
    return messages || [];
  }

  async getMessagesBefore(beforeTimestamp, limit = 50) {
    const messages = await this.getMessages();
    return messages
      .filter(m => m.timestamp < beforeTimestamp)
      .slice(-limit);
  }

  async storeMessage(userId, userName, content) {
    const messages = await this.getMessages();
    
    const message = {
      id: Date.now(),
      userId,
      userName,
      content,
      timestamp: Date.now(),
      readBy: [userId] // Sender has read it
    };

    messages.push(message);

    // Keep only last 1000 messages in memory
    const trimmed = messages.slice(-1000);
    await this.state.storage.put('messages', trimmed);

    return message;
  }

  async deleteMessage(messageId) {
    const messages = await this.getMessages();
    const filtered = messages.filter(m => m.id !== messageId);
    await this.state.storage.put('messages', filtered);
  }

  async markAsRead(userId, timestamp) {
    const messages = await this.getMessages();
    let updated = false;

    for (const message of messages) {
      if (message.timestamp <= timestamp && !message.readBy.includes(userId)) {
        message.readBy.push(userId);
        updated = true;
      }
    }

    if (updated) {
      await this.state.storage.put('messages', messages);
    }
  }

  // ==================== BROADCASTING ====================

  broadcastMessage(message) {
    this.broadcast({
      type: 'message',
      ...message
    });
  }

  broadcast(data, excludeUserIds = []) {
    const payload = JSON.stringify(data);

    for (const [userId, session] of this.sessions) {
      if (!excludeUserIds.includes(userId)) {
        try {
          session.ws.send(payload);
        } catch (error) {
          console.error(`Failed to send to ${userId}:`, error);
          // Remove dead connection
          this.sessions.delete(userId);
        }
      }
    }
  }
}

// ==================== HELPER FUNCTIONS ====================

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
