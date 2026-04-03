// src/utils/encryption.js - Fixed with proper key handling
class EncryptionManager {
  constructor() {
    this.sharedSecret = null;
    this.isEnabled = false;
  }

  setSharedSecret(secret) {
    this.sharedSecret = secret;
    this.isEnabled = true;
    console.log('🔐 Shared secret set, encryption enabled');
  }

  async encryptMessage(message) {
    if (!this.isEnabled || !this.sharedSecret) {
      console.warn('Encryption not enabled, sending plain text');
      return message;
    }
    
    try {
      // Use the shared secret for XOR encryption
      const result = [];
      for (let i = 0; i < message.length; i++) {
        const charCode = message.charCodeAt(i);
        const keyChar = this.sharedSecret.charCodeAt(i % this.sharedSecret.length);
        const encryptedChar = charCode ^ keyChar;
        result.push(encryptedChar.toString(16).padStart(2, '0'));
      }
      return result.join('');
    } catch (error) {
      console.error('Encryption error:', error);
      return message;
    }
  }

  async decryptMessage(encryptedHex) {
    if (!this.isEnabled || !this.sharedSecret) {
      console.warn('Decryption not enabled');
      return encryptedHex;
    }
    
    try {
      // Decrypt the hex string
      const encryptedBytes = [];
      for (let i = 0; i < encryptedHex.length; i += 2) {
        encryptedBytes.push(parseInt(encryptedHex.substr(i, 2), 16));
      }
      
      const result = [];
      for (let i = 0; i < encryptedBytes.length; i++) {
        const keyChar = this.sharedSecret.charCodeAt(i % this.sharedSecret.length);
        const decryptedChar = encryptedBytes[i] ^ keyChar;
        result.push(String.fromCharCode(decryptedChar));
      }
      return result.join('');
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedHex;
    }
  }

  reset() {
    this.sharedSecret = null;
    this.isEnabled = false;
    console.log('Encryption reset');
  }
}

export default new EncryptionManager();