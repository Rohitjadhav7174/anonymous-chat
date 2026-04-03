import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

const ChatRoom = ({ messages, onSendMessage, partnerTyping, status }) => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (status === 'connected') {
      inputRef.current?.focus();
    }
  }, [status]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      onSendMessage(inputMessage);
      setInputMessage('');
    }
  };

  return (
    <div className="chat-room">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-chat">
       
            <p>Start chatting with your partner!</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <MessageBubble
            key={idx}
            message={msg.text}
            isOwn={msg.isOwn}
            timestamp={msg.timestamp}
            status={msg.status}
          />
        ))}
        
        {partnerTyping && (
          <div className="typing-indicator">
            <span>Stranger is typing</span>
            <span className="dots">...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          ref={inputRef}
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          maxLength={500}
          className="chat-input"
          disabled={status !== 'connected'}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={!inputMessage.trim() || status !== 'connected'}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatRoom;