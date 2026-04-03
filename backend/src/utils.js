// Utility functions for the chat system

const sanitizeMessage = (message) => {
  if (!message) return '';
  // Remove HTML tags
  return message.replace(/[<>]/g, '').trim();
};

const validateMessage = (message, maxLength = 500) => {
  if (!message || message.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (message.length > maxLength) {
    return { valid: false, error: `Message too long (max ${maxLength} characters)` };
  }
  
  return { valid: true };
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

module.exports = {
  sanitizeMessage,
  validateMessage,
  formatTimestamp
};