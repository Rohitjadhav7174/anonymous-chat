class Matchmaking {
  constructor() {
    this.waitingQueue = [];
    this.activeChats = new Map();
  }

  addToQueue(userId, socketId) {
    if (!this.waitingQueue.find(u => u.userId === userId)) {
      this.waitingQueue.push({ userId, socketId, joinedAt: Date.now() });
      console.log(`➕ Queue size: ${this.waitingQueue.length}`);
      return true;
    }
    return false;
  }

  removeFromQueue(userId) {
    const index = this.waitingQueue.findIndex(u => u.userId === userId);
    if (index !== -1) {
      this.waitingQueue.splice(index, 1);
      console.log(`➖ Queue size: ${this.waitingQueue.length}`);
      return true;
    }
    return false;
  }

  findMatch(userId) {
    // Find a different user (not self)
    const match = this.waitingQueue.find(u => u.userId !== userId);
    return match || null;
  }

  createChat(user1, user2) {
    this.activeChats.set(user1.userId, user2.userId);
    this.activeChats.set(user2.userId, user1.userId);
    
    this.removeFromQueue(user1.userId);
    this.removeFromQueue(user2.userId);
    
    console.log(`💑 New chat created: ${user1.userId} <-> ${user2.userId}`);
    console.log(`💬 Active chats: ${this.activeChats.size / 2}`);
    
    return { user1, user2 };
  }

  endChat(userId) {
    const partnerId = this.activeChats.get(userId);
    if (partnerId) {
      this.activeChats.delete(userId);
      this.activeChats.delete(partnerId);
      console.log(`👋 Chat ended: ${userId} <-> ${partnerId}`);
      return partnerId;
    }
    return null;
  }

  getPartner(userId) {
    return this.activeChats.get(userId) || null;
  }

  isInChat(userId) {
    return this.activeChats.has(userId);
  }

  isInQueue(userId) {
    return this.waitingQueue.some(u => u.userId === userId);
  }

  getQueueSize() {
    return this.waitingQueue.length;
  }
}

module.exports = Matchmaking;