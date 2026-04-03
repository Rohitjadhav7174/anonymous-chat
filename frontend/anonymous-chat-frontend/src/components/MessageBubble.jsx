import React from 'react';

const MessageBubble = ({ message, isOwn, timestamp, status }) => {
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`message-bubble-wrapper ${isOwn ? 'own' : 'other'}`}>
      <div className="message-bubble">
        <div className="message-content">
          {message}
        </div>
        <div className="message-footer">
          <span className="message-time">{formatTime(timestamp)}</span>
          {isOwn && status && (
            <span className="message-status">
              {status === 'sent' && '✓'}
              {status === 'delivered' && '✓✓'}
              {status === 'read' && '✓✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;