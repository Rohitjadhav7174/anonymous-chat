const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const Matchmaking = require('./matchmaking');
const db = require('./database');

class WebSocketManager {
  constructor(server, frontendUrl) {
    this.io = new Server(server, {
      cors: {
        origin: frontendUrl || 'http://localhost:3000',
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });
    
    this.matchmaking = new Matchmaking();
    this.users = new Map();
    this.rateLimits = new Map();
    
    this.init();
  }

  init() {
    this.io.on('connection', (socket) => {
      console.log(`🟢 New connection: ${socket.id}`);
      
      const sessionId = uuidv4();
      const userId = socket.id;
      
      this.users.set(socket.id, { userId, sessionId, connectedAt: Date.now() });
      
      // Save user to database
      db.run('INSERT OR IGNORE INTO users (session_id) VALUES (?)', [sessionId]);
      
      // Send session ID to client
      socket.emit('session_id', { sessionId, userId });
      
      console.log(`📝 User registered: ${userId} with session: ${sessionId}`);
      
      // Handle start search
      socket.on('start_search', () => {
        this.handleStartSearch(socket);
      });
      
      // Handle stop search
      socket.on('stop_search', () => {
        this.handleStopSearch(socket);
      });
      
      // Handle send message
      socket.on('send_message', (data) => {
        this.handleSendMessage(socket, data);
      });
      
      // Handle skip/end chat
      socket.on('skip_chat', () => {
        this.handleSkipChat(socket);
      });
      
      // Handle typing indicator
      socket.on('typing', (isTyping) => {
        this.handleTyping(socket, isTyping);
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }
  
  handleStartSearch(socket) {
    const user = this.users.get(socket.id);
    if (!user) return;
    
    // Check if already in chat
    if (this.matchmaking.isInChat(user.userId)) {
      socket.emit('error', { message: 'Already in a chat. Please end current chat first.' });
      return;
    }
    
    // Remove from any existing queue
    this.matchmaking.removeFromQueue(user.userId);
    
    // Add to waiting queue
    this.matchmaking.addToQueue(user.userId, socket.id);
    socket.emit('searching', { status: 'searching', message: 'Looking for a partner...' });
    
    console.log(`🔍 User ${user.userId} is searching for a partner`);
    
    // Try to find a match
    this.tryMatch(user.userId, socket);
  }
  
  handleStopSearch(socket) {
    const user = this.users.get(socket.id);
    if (user) {
      this.matchmaking.removeFromQueue(user.userId);
      socket.emit('search_stopped', { status: 'stopped', message: 'Search stopped' });
      console.log(`⏹️ User ${user.userId} stopped searching`);
    }
  }
  
  handleSendMessage(socket, data) {
    const user = this.users.get(socket.id);
    if (!user) return;
    
    const { message } = data;
    
    // Validate message
    if (!message || message.trim().length === 0) {
      socket.emit('error', { message: 'Message cannot be empty' });
      return;
    }
    
    // Check message length
    const MAX_LENGTH = parseInt(process.env.MAX_MESSAGE_LENGTH) || 500;
    if (message.length > MAX_LENGTH) {
      socket.emit('error', { message: `Message too long (max ${MAX_LENGTH} characters)` });
      return;
    }
    
    // Rate limiting
    if (!this.checkRateLimit(user.userId)) {
      socket.emit('error', { message: 'Too many messages. Please wait a moment.' });
      return;
    }
    
    // Save message to database
    const sanitizedMessage = message.substring(0, 500).replace(/[<>]/g, '');
    db.run('INSERT INTO messages (session_id, message) VALUES (?, ?)', 
      [user.sessionId, sanitizedMessage]);
    
    // Send to partner
    const partnerId = this.matchmaking.getPartner(user.userId);
    if (partnerId) {
      const partnerSocket = this.getSocketByUserId(partnerId);
      if (partnerSocket && partnerSocket.connected) {
        partnerSocket.emit('new_message', {
          message: sanitizedMessage,
          timestamp: new Date().toISOString(),
          isOwn: false
        });
        
        socket.emit('message_sent', {
          message: sanitizedMessage,
          timestamp: new Date().toISOString(),
          isOwn: true
        });
        
        console.log(`💬 Message sent from ${user.userId} to ${partnerId}`);
      } else {
        socket.emit('error', { message: 'Partner disconnected' });
        this.handleSkipChat(socket);
      }
    } else {
      socket.emit('error', { message: 'No active chat partner' });
    }
  }
  
  handleTyping(socket, isTyping) {
    const user = this.users.get(socket.id);
    if (!user) return;
    
    const partnerId = this.matchmaking.getPartner(user.userId);
    if (partnerId) {
      const partnerSocket = this.getSocketByUserId(partnerId);
      if (partnerSocket) {
        partnerSocket.emit('user_typing', { isTyping, userId: user.userId });
      }
    }
  }
  
  handleSkipChat(socket) {
    const user = this.users.get(socket.id);
    if (!user) return;
    
    const partnerId = this.matchmaking.endChat(user.userId);
    
    if (partnerId) {
      const partnerSocket = this.getSocketByUserId(partnerId);
      if (partnerSocket && partnerSocket.connected) {
        partnerSocket.emit('partner_disconnected', { 
          message: 'Your partner has left the chat',
          timestamp: new Date().toISOString()
        });
        
        // Update chat history
        const userData = this.users.get(socket.id);
        const partnerData = this.users.get(partnerSocket.id);
        
        if (userData && partnerData) {
          db.run(`UPDATE chat_history 
                  SET ended_at = CURRENT_TIMESTAMP 
                  WHERE session_id = ? AND partner_id = ? AND ended_at IS NULL`,
            [userData.sessionId, partnerData.sessionId]);
        }
      }
    }
    
    socket.emit('chat_ended', { message: 'You left the chat', timestamp: new Date().toISOString() });
    console.log(`👋 User ${user.userId} skipped/ended chat`);
    
    // Auto start searching again
    setTimeout(() => {
      if (this.users.has(socket.id) && !this.matchmaking.isInChat(user.userId)) {
        this.handleStartSearch(socket);
      }
    }, 1000);
  }
  
  handleDisconnect(socket) {
    const user = this.users.get(socket.id);
    if (user) {
      // Remove from queue
      this.matchmaking.removeFromQueue(user.userId);
      
      // End any active chat
      const partnerId = this.matchmaking.endChat(user.userId);
      if (partnerId) {
        const partnerSocket = this.getSocketByUserId(partnerId);
        if (partnerSocket && partnerSocket.connected) {
          partnerSocket.emit('partner_disconnected', { 
            message: 'Your partner has disconnected',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Clean up rate limits
      this.rateLimits.delete(user.userId);
      
      // Remove user
      this.users.delete(socket.id);
      
      console.log(`🔴 User ${user.userId} disconnected`);
      console.log(`📊 Active users: ${this.users.size}`);
    }
  }
  
  tryMatch(userId, socket) {
    setTimeout(() => {
      // Check if user is still in queue and not in chat
      if (this.matchmaking.isInQueue(userId) && !this.matchmaking.isInChat(userId)) {
        const match = this.matchmaking.findMatch(userId);
        
        if (match && this.matchmaking.isInQueue(userId)) {
          const user1 = { userId, socketId: socket.id };
          const user2 = match;
          
          const chat = this.matchmaking.createChat(user1, user2);
          
          // Notify both users
          const socket2 = this.getSocketByUserId(user2.userId);
          
          if (socket2 && socket2.connected) {
            socket.emit('matched', { 
              partnerId: user2.userId,
              timestamp: new Date().toISOString()
            });
            
            socket2.emit('matched', { 
              partnerId: userId,
              timestamp: new Date().toISOString()
            });
            
            // Save chat history
            const user1Data = this.users.get(socket.id);
            const user2Data = this.users.get(socket2.id);
            
            if (user1Data && user2Data) {
              db.run(`INSERT INTO chat_history (session_id, partner_id, started_at) 
                      VALUES (?, ?, CURRENT_TIMESTAMP)`,
                [user1Data.sessionId, user2Data.sessionId]);
            }
            
            console.log(`✅ Match found! ${userId} <-> ${user2.userId}`);
          } else {
            // Partner disconnected, try again
            this.matchmaking.removeFromQueue(userId);
            this.handleStartSearch(socket);
          }
        } else {
          // No match yet, keep waiting
          socket.emit('searching', { 
            status: 'searching', 
            message: `Still searching... (${this.matchmaking.getQueueSize()} people waiting)` 
          });
        }
      }
    }, 500);
  }
  
  checkRateLimit(userId) {
    const now = Date.now();
    const limit = parseInt(process.env.MESSAGE_RATE_LIMIT) || 10;
    const window = parseInt(process.env.RATE_LIMIT_WINDOW) || 60000;
    
    let userLimit = this.rateLimits.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimits.set(userId, {
        count: 1,
        resetTime: now + window
      });
      return true;
    }
    
    if (userLimit.count >= limit) {
      return false;
    }
    
    userLimit.count++;
    this.rateLimits.set(userId, userLimit);
    return true;
  }
  
  getSocketByUserId(userId) {
    for (let [socketId, user] of this.users) {
      if (user.userId === userId) {
        return this.io.sockets.sockets.get(socketId);
      }
    }
    return null;
  }
}

module.exports = WebSocketManager;