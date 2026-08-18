import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

type MessageHandler = (msg: any) => void;

/**
 * Xác định URL WebSocket:
 * - Ưu tiên NEXT_PUBLIC_WS_URL nếu được cấu hình.
 * - Nếu không, lấy hostname mà trình duyệt đang mở app (localhost hoặc IP LAN),
 *   ghép với cổng backend 8089 để SockJS luôn tới đúng máy chạy backend.
 */
function resolveSocketUrl(): string {
    if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
    const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || '8089';
    if (typeof window !== 'undefined') {
        const host = window.location.hostname || 'localhost';
        return `http://${host}:${backendPort}/ws`;
    }
    return `http://localhost:${backendPort}/ws`;
}

class WebSocketService {
    private client: Client | null = null;
    private subscriptions: Map<string, any> = new Map();
    /** Multiple listeners per user — booking chat + inquiry chat + badge can all receive. */
    private messageHandlers: Map<number, Set<MessageHandler>> = new Map();
    private notificationHandlers: Map<number, Set<MessageHandler>> = new Map();
    private connectedUserId: number | null = null;

    connect(userId: number, onMessage?: MessageHandler, onNotification?: MessageHandler) {
        if (onMessage) this.addMessageHandler(userId, onMessage);
        if (onNotification) this.addNotificationHandler(userId, onNotification);

        // Same user & client exists (even while still connecting) — keep it;
        // subscription happens in onConnect when the connection is ready.
        if (this.client && this.connectedUserId === userId) {
            this.subscribeToUser(userId);
            if (onNotification) this.subscribeToNotifications(userId);
            return;
        }

        // Switching user or first connect
        if (this.client && this.connectedUserId !== userId) {
            this.disconnect();
            if (onMessage) this.addMessageHandler(userId, onMessage);
            if (onNotification) this.addNotificationHandler(userId, onNotification);
        }

        let socketUrl = resolveSocketUrl();
        if (socketUrl.startsWith('ws:')) {
            socketUrl = 'http:' + socketUrl.substring(3);
        } else if (socketUrl.startsWith('wss:')) {
            socketUrl = 'https:' + socketUrl.substring(4);
        }
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        this.connectedUserId = userId;
        this.client = new Client({
            webSocketFactory: () => new SockJS(socketUrl),
            connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
            debug: () => {},
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                // Subscriptions die with the old connection; always re-subscribe on (re)connect.
                this.subscriptions.clear();
                this.subscribeToUser(userId);
                this.subscribeToNotifications(userId);
            },
            onStompError: () => {},
            onWebSocketError: () => {},
        });

        this.client.activate();
    }

    /** Register an extra message listener without replacing others. */
    addMessageHandler(userId: number, handler: MessageHandler) {
        if (!this.messageHandlers.has(userId)) {
            this.messageHandlers.set(userId, new Set());
        }
        this.messageHandlers.get(userId)!.add(handler);
    }

    removeMessageHandler(userId: number, handler: MessageHandler) {
        this.messageHandlers.get(userId)?.delete(handler);
    }

    addNotificationHandler(userId: number, handler: MessageHandler) {
        if (!this.notificationHandlers.has(userId)) {
            this.notificationHandlers.set(userId, new Set());
        }
        this.notificationHandlers.get(userId)!.add(handler);
    }

    removeNotificationHandler(userId: number, handler: MessageHandler) {
        this.notificationHandlers.get(userId)?.delete(handler);
    }

    private dispatchMessages(userId: number, parsed: any) {
        const handlers = this.messageHandlers.get(userId);
        if (handlers) {
            handlers.forEach((cb) => {
                try { cb(parsed); } catch (e) { console.error('WS message handler error', e); }
            });
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('notifications-updated'));
            window.dispatchEvent(new CustomEvent('ws-chat-message', { detail: parsed }));
        }
    }

    private dispatchNotifications(userId: number, parsed: any) {
        const handlers = this.notificationHandlers.get(userId);
        if (handlers) {
            handlers.forEach((cb) => {
                try { cb(parsed); } catch (e) { console.error('WS notification handler error', e); }
            });
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('notifications-updated'));
        }
    }

    private subscribeToUser(userId: number) {
        if (!this.client || !this.client.connected) {
            console.warn('Cannot subscribe: STOMP client is not connected');
            return;
        }

        const topic = `/queue/messages/${userId}`;
        if (this.subscriptions.has(topic)) return;

        const sub = this.client.subscribe(topic, (message) => {
            if (message.body) {
                const parsed = JSON.parse(message.body);
                this.dispatchMessages(userId, parsed);
            }
        });
        this.subscriptions.set(topic, sub);
    }

    subscribeToNotifications(userId: number, onNotification?: MessageHandler) {
        if (onNotification) this.addNotificationHandler(userId, onNotification);

        if (!this.client || !this.client.connected) {
            console.warn('Cannot subscribe to notifications: STOMP client is not connected');
            return;
        }
        const topic = `/queue/notifications/${userId}`;
        if (this.subscriptions.has(topic)) return;

        const sub = this.client.subscribe(topic, (message) => {
            if (message.body) {
                const parsed = JSON.parse(message.body);
                this.dispatchNotifications(userId, parsed);
            }
        });
        this.subscriptions.set(topic, sub);
    }

    disconnect() {
        if (this.client) {
            this.client.deactivate();
            this.client = null;
            this.subscriptions.clear();
            this.messageHandlers.clear();
            this.notificationHandlers.clear();
            this.connectedUserId = null;
        }
    }
}

export const webSocketService = new WebSocketService();
