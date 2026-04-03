const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../chat.db'));

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      session_id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_messages INTEGER DEFAULT 0,
      total_chats INTEGER DEFAULT 0
    )
  `);

  // Messages table for rate limiting and history
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      message_length INTEGER,
      FOREIGN KEY (session_id) REFERENCES users(session_id)
    )
  `);

  // Chat history table
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      partner_id TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      message_count INTEGER DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES users(session_id)
    )
  `);

  // Create indexes for better performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_chat_history_session ON chat_history(session_id)`);
  
  console.log('✅ Database initialized');
});

module.exports = db;