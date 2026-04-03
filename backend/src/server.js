const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const WebSocketManager = require('./websocket');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeUsers: global.activeUsers || 0
  });
});

// Get server stats
app.get('/stats', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    message: 'Anonymous Chat Backend is running'
  });
});

// Initialize WebSocket manager
const wsManager = new WebSocketManager(server, process.env.FRONTEND_URL || 'http://localhost:3000');

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});