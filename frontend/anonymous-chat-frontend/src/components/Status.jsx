import React from 'react';

const Status = ({ status, queueSize }) => {
  const getStatusConfig = () => {
    switch(status) {
      case 'connected':
        return {
          icon: '',
          text: 'Connected',
          color: '#4ade80'
        };
      case 'searching':
        return {
          icon: '',
          text: `Searching... (${queueSize} waiting)`,
          color: '#fbbf24'
        };
      case 'disconnected':
        return {
          icon: '',
          text: 'Disconnected',
          color: '#9ca3af'
        };
      default:
        return {
          icon: '',
          text: 'Ready',
          color: '#10b981'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="status-component" style={{ '--status-color': config.color }}>
      <span className="status-icon">{config.icon}</span>
      <span className="status-text">{config.text}</span>
    </div>
  );
};

export default Status;