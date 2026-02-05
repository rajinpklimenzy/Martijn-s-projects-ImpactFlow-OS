/**
 * Notification WebSocket Client
 * Handles real-time notification delivery via WebSocket
 */

/**
 * Get API base URL (same logic as api.ts)
 */
const getApiBase = () => {
  // Check for process.env (Vite replaces this at build time)
  if (typeof process !== 'undefined' && process.env?.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  // Fallback: try to infer from current location in development
  if (typeof window !== 'undefined') {
    // In development, if running on localhost, use localhost:8050
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://127.0.0.1:8050/api/v1/impactOS';
    }
  }
  // Production fallback
  return 'https://node-server.impact24x7.com/api/v1/impactOS';
};

/**
 * Convert HTTP/HTTPS URL to WebSocket URL
 */
const getWebSocketUrl = (apiBase: string): string => {
  try {
    // Parse the API base URL to extract host and port
    const url = new URL(apiBase);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use host (includes port if specified)
    return `${protocol}//${url.host}`;
  } catch (error) {
    // Fallback: if URL parsing fails, try to extract host from string
    console.warn('[NOTIFICATION WS] Failed to parse API URL, using fallback');
    // Default to localhost:8050 for development
    return 'ws://127.0.0.1:8050';
  }
};

export interface NotificationMessage {
  type: 'connected' | 'notification' | 'error';
  data?: any;
  message?: string;
  timestamp?: string;
}

export class NotificationWebSocket {
  private ws: WebSocket | null = null;
  private userId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private reconnectTimer: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnecting = false;

  constructor(userId: string) {
    this.userId = userId;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // Wait for existing connection attempt
        const checkInterval = setInterval(() => {
          if (!this.isConnecting) {
            clearInterval(checkInterval);
            if (this.ws?.readyState === WebSocket.OPEN) {
              resolve();
            } else {
              reject(new Error('Connection failed'));
            }
          }
        }, 100);
        return;
      }

      this.isConnecting = true;
      
      // Get WebSocket URL from API base URL
      const apiBase = getApiBase();
      const wsBase = getWebSocketUrl(apiBase);
      const wsUrl = `${wsBase}/ws/notifications?userId=${encodeURIComponent(this.userId || '')}`;

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[NOTIFICATION WS] Connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: NotificationMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[NOTIFICATION WS] Error parsing message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[NOTIFICATION WS] WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[NOTIFICATION WS] Connection closed');
          this.isConnecting = false;
          this.ws = null;
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[NOTIFICATION WS] Max reconnect attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      return; // Already attempting to reconnect
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000); // Max 30 seconds

    console.log(`[NOTIFICATION WS] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((error) => {
        console.error('[NOTIFICATION WS] Reconnect failed:', error);
      });
    }, delay);
  }

  private handleMessage(message: NotificationMessage) {
    if (message.type === 'connected') {
      console.log('[NOTIFICATION WS]', message.message);
      this.emit('connected', message);
    } else if (message.type === 'notification') {
      this.emit('notification', message.data);
    } else if (message.type === 'error') {
      console.error('[NOTIFICATION WS] Error:', message.message);
      this.emit('error', message);
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[NOTIFICATION WS] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getUserId(): string | null {
    return this.userId;
  }
}

// Singleton instance
let notificationWsInstance: NotificationWebSocket | null = null;

export const getNotificationWebSocket = (userId: string): NotificationWebSocket => {
  // Always create a new instance if userId changes or instance doesn't exist
  if (!notificationWsInstance) {
    notificationWsInstance = new NotificationWebSocket(userId);
  } else {
    // If userId changed, disconnect and create new instance
    const currentUserId = notificationWsInstance.getUserId();
    if (currentUserId !== userId) {
      notificationWsInstance.disconnect();
      notificationWsInstance = new NotificationWebSocket(userId);
    }
  }
  return notificationWsInstance;
};

export const disconnectNotificationWebSocket = () => {
  if (notificationWsInstance) {
    notificationWsInstance.disconnect();
    notificationWsInstance = null;
  }
};
