import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

function App() {
  const [socket, setSocket] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('disconnected');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [partnerId, setPartnerId] = useState(null);
  const [queueSize, setQueueSize] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize socket connection
  useEffect(() => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('connect', () => {
      console.log('Connected to server');
      addSystemMessage('Connected to chat server');
    });

    newSocket.on('session_id', (data) => {
      setSessionId(data.sessionId);
      console.log('Session ID:', data.sessionId);
    });

    newSocket.on('searching', (data) => {
      setStatus('searching');
      setIsSearching(true);
      setQueueSize(data.queueSize || 0);
      addSystemMessage(data.message || 'Searching for a partner...');
    });

    newSocket.on('search_stopped', (data) => {
      setStatus('disconnected');
      setIsSearching(false);
      addSystemMessage(data?.message || 'Search stopped');
    });

    newSocket.on('matched', (data) => {
      setStatus('connected');
      setIsSearching(false);
      setPartnerId(data.partnerId);
      addSystemMessage('Connected! Start chatting... ');
    });

    newSocket.on('new_message', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: data.message,
        isOwn: false,
        timestamp: new Date(data.timestamp),
        status: 'delivered'
      }]);
    });

    newSocket.on('message_sent', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: data.message,
        isOwn: true,
        timestamp: new Date(data.timestamp),
        status: 'sent'
      }]);
    });

    newSocket.on('partner_disconnected', (data) => {
      setStatus('disconnected');
      setPartnerId(null);
      addSystemMessage(data.message || 'Your partner has disconnected');
    });

    newSocket.on('chat_ended', (data) => {
      setStatus('disconnected');
      setPartnerId(null);
      addSystemMessage(data.message || 'Chat ended');
    });

    newSocket.on('user_typing', (data) => {
      setPartnerTyping(data.isTyping);
      if (data.isTyping) {
        setTimeout(() => setPartnerTyping(false), 3000);
      }
    });

    newSocket.on('error', (data) => {
      addSystemMessage(`⚠️ ${data.message}`);
    });

    newSocket.on('disconnect', () => {
      setStatus('disconnected');
      setIsSearching(false);
      setPartnerId(null);
      addSystemMessage('Disconnected from server. Reconnecting...');
    });

    newSocket.on('reconnect', () => {
      addSystemMessage('Reconnected to server');
    });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      newSocket.close();
    };
  }, []);

  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      text,
      isSystem: true,
      timestamp: new Date()
    }]);
  };

  const startSearch = () => {
    if (socket) {
      socket.emit('start_search');
      setMessages([]);
    }
  };

  const stopSearch = () => {
    if (socket && isSearching) {
      socket.emit('stop_search');
    }
  };

  const skipChat = () => {
    if (socket && status === 'connected') {
      socket.emit('skip_chat');
      addSystemMessage('Skipping to next partner...');
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    
    if (status !== 'connected') {
      addSystemMessage('❌ Not connected to a partner');
      return;
    }

    socket.emit('send_message', { message: inputMessage });
    setInputMessage('');
    
    // Stop typing indicator
    if (isTyping) {
      socket.emit('typing', false);
      setIsTyping(false);
    }
  };

  const handleTyping = (e) => {
    setInputMessage(e.target.value);
    
    if (!isTyping && e.target.value.length > 0 && status === 'connected') {
      setIsTyping(true);
      socket.emit('typing', true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socket.emit('typing', false);
      }, 2000);
    } else if (e.target.value.length === 0 && isTyping) {
      setIsTyping(false);
      socket.emit('typing', false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header>
          <h1> Anonymous Random Chat</h1>
          <div className="status-bar">
            <div className={`status status-${status}`}>
              <span className="status-dot"></span>
              <span className="status-text">
                {status === 'connected' && `Connected with ${partnerId?.slice(-6)}`}
                {status === 'searching' && `Searching... (${queueSize} waiting)`}
                {status === 'disconnected' && 'Disconnected'}
              </span>
            </div>
            {sessionId && (
              <div className="session-info">
                ID: {sessionId.slice(-8)}
              </div>
            )}
          </div>
        </header>

        <div className="chat-container">
          <div className="messages-area">
            {messages.length === 0 && status !== 'searching' && (
              <div className="welcome-message">
              
                <h3>Welcome to Anonymous Chat</h3>
                <p>Click "Start Chatting" to connect with a random stranger</p>
                <p className="small-note">Your identity is completely anonymous</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`message ${msg.isOwn ? 'own' : ''} ${msg.isSystem ? 'system' : ''}`}
              >
                {!msg.isSystem && (
                  <div className="message-bubble">
                    <div className="message-text">{msg.text}</div>
                    <div className="message-meta">
                      <span className="message-time">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                      {msg.isOwn && msg.status && (
                        <span className="message-status">
                          {msg.status === 'sent' ? '✓' : '✓✓'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {msg.isSystem && (
                  <div className="system-message">
                    <span>{msg.text}</span>
                  </div>
                )}
              </div>
            ))}
            
            {partnerTyping && (
              <div className="typing-indicator">
                <span>Stranger is typing</span>
                <span className="typing-dots">...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="controls-area">
            {status === 'disconnected' && !isSearching && (
              <button onClick={startSearch} className="btn btn-primary">
                 Start Chatting
              </button>
            )}
            
            {status === 'searching' && (
              <button onClick={stopSearch} className="btn btn-secondary">
                Stop Searching
              </button>
            )}
            
            {status === 'connected' && (
              <button onClick={skipChat} className="btn btn-danger">
                Skip / End Chat
              </button>
            )}
          </div>

          {status === 'connected' && (
            <form onSubmit={sendMessage} className="input-area">
              <input
                type="text"
                value={inputMessage}
                onChange={handleTyping}
                placeholder="Type your message..."
                maxLength={500}
                className="message-input"
                autoComplete="off"
              />
              <button type="submit" className="btn-send" disabled={!inputMessage.trim()}>
                Send
              </button>
            </form>
          )}
        </div>

        <footer>
          
        </footer>
      </div>
    </div>
  );
}

export default App;