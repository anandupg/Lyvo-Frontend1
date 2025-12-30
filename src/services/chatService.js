import io from 'socket.io-client';

/**
 * Chat Service for real-time communication
 * Handles WebSocket connections and API calls to chat service
 */
class ChatService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentChatId = null;
    this.eventListeners = new Map();
    this.apiBaseUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  }

  /**
   * Connect to chat service with JWT token
   */
  connect(token) {
    if (this.socket) {
      this.disconnect();
    }

    console.log('🔌 Connecting to chat service...');

    this.socket = io(this.apiBaseUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to chat service');
      this.isConnected = true;
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from chat service:', reason);
      this.isConnected = false;
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Chat service connection error:', error);
      this.emit('error', error);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Chat service error:', error);
      this.emit('error', error);
    });

    return this.socket;
  }

  /**
   * Disconnect from chat service
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting from chat service...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentChatId = null;
    }
  }

  /**
   * Join a chat room
   */
  joinChat(chatId) {
    if (this.socket && this.isConnected) {
      console.log('👥 Joining chat:', chatId);
      this.socket.emit('join_chat', { chatId });
      this.currentChatId = chatId;
    } else {
      console.warn('⚠️ Cannot join chat: not connected to chat service');
    }
  }

  /**
   * Leave current chat room
   */
  leaveChat() {
    if (this.socket && this.currentChatId) {
      console.log('👋 Leaving chat:', this.currentChatId);
      this.socket.emit('leave_chat', { chatId: this.currentChatId });
      this.currentChatId = null;
    }
  }

  /**
   * Send a notification (for testing or real-time alerts)
   */
  sendNotification(data) {
    if (this.socket && this.isConnected) {
      console.log('📨 Sending notification:', data);
      this.socket.emit('send_notification', data);
    } else {
      console.warn('⚠️ Cannot send notification: not connected');
    }
  }

  /**
   * Send a message
   */
  sendMessage(content, contentType = 'text', metadata = {}) {
    if (this.socket && this.isConnected && this.currentChatId) {
      console.log('💬 Sending message:', content);
      this.socket.emit('send_message', {
        chatId: this.currentChatId,
        content,
        contentType,
        metadata
      });
    } else {
      console.warn('⚠️ Cannot send message: not connected or no active chat');
    }
  }

  /**
   * Mark messages as read
   */
  markAsRead(messageIds = []) {
    if (this.socket && this.isConnected && this.currentChatId) {
      this.socket.emit('mark_read', {
        chatId: this.currentChatId,
        messageIds
      });
    }
  }

  /**
   * Set typing status
   */
  setTyping(isTyping) {
    if (this.socket && this.isConnected && this.currentChatId) {
      this.socket.emit('typing', {
        chatId: this.currentChatId,
        isTyping
      });
    }
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }

    // Store for reconnection
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }

    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit custom event
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Get user's chats via REST API
   */
  async getUserChats(userId) {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${this.apiBaseUrl}/api/chat/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data.chats : [];
    } catch (error) {
      console.error('Error fetching user chats:', error);
      return [];
    }
  }

  /**
   * Get chat messages via REST API
   */
  async getChatMessages(chatId, page = 1, limit = 50) {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${this.apiBaseUrl}/api/chat/${chatId}/messages?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data.messages : [];
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return [];
    }
  }

  /**
   * Get chat details via REST API
   */
  async getChatDetails(chatId) {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${this.apiBaseUrl}/api/chat/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error fetching chat details:', error);
      return null;
    }
  }

  /**
   * Send message via REST API (fallback)
   */
  async sendMessageAPI(chatId, content, contentType = 'text', metadata = {}) {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${this.apiBaseUrl}/api/chat/${chatId}/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          contentType,
          metadata
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error sending message via API:', error);
      return null;
    }
  }

  /**
   * Mark messages as read via REST API
   */
  async markAsReadAPI(chatId, messageIds = []) {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${this.apiBaseUrl}/api/chat/${chatId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messageIds })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error marking messages as read via API:', error);
      return false;
    }
  }

  /**
   * Check if service is connected
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      currentChatId: this.currentChatId,
      socketId: this.socket?.id
    };
  }
}

// Create singleton instance
const chatService = new ChatService();

export default chatService;