import { 
  Notification, 
  NotificationFilter, 
  NotificationPreferences,
  NotificationRule,
  NotificationChannel 
} from './types';
import { generateUUID } from '@/lib/utils';
import { toast } from 'sonner';

export class NotificationService {
  private static instance: NotificationService;
  private notifications: Map<string, Notification> = new Map();
  private preferences: NotificationPreferences;
  private rules: Map<string, NotificationRule> = new Map();
  private channels: Map<string, NotificationChannel> = new Map();
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private soundEnabled: boolean = true;
  private notificationSound: HTMLAudioElement;

  private constructor() {
    this.preferences = this.loadPreferences();
    this.loadNotifications();
    this.loadRules();
    this.initializeChannels();
    this.notificationSound = new Audio('/sounds/notification.mp3');
    this.setupBackgroundSync();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private loadPreferences(): NotificationPreferences {
    const stored = localStorage.getItem('notification-preferences');
    if (stored) {
      return JSON.parse(stored);
    }
    
    return {
      enabled: true,
      sound: true,
      desktop: true,
      email: false,
      filters: {
        types: {
          info: true,
          success: true,
          warning: true,
          error: true,
          mention: true,
          task: true,
          reminder: true,
        },
        priorities: {
          low: true,
          medium: true,
          high: true,
          urgent: true,
        },
      },
    };
  }

  private loadNotifications() {
    const stored = localStorage.getItem('notifications');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.forEach((notif: any) => {
        this.notifications.set(notif.id, {
          ...notif,
          timestamp: new Date(notif.timestamp),
          expiresAt: notif.expiresAt ? new Date(notif.expiresAt) : undefined,
        });
      });
    }
  }

  private loadRules() {
    const stored = localStorage.getItem('notification-rules');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.forEach((rule: any) => {
        this.rules.set(rule.id, {
          ...rule,
          createdAt: new Date(rule.createdAt),
          updatedAt: new Date(rule.updatedAt),
        });
      });
    }
  }

  private initializeChannels() {
    // Browser notifications channel
    this.channels.set('browser', {
      id: 'browser',
      type: 'browser',
      name: 'Browser Notifications',
      config: {},
      enabled: true,
    });

    // Load custom channels from storage
    const stored = localStorage.getItem('notification-channels');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.forEach((channel: NotificationChannel) => {
        this.channels.set(channel.id, channel);
      });
    }
  }

  private saveNotifications() {
    const notifs = Array.from(this.notifications.values());
    localStorage.setItem('notifications', JSON.stringify(notifs));
  }

  private savePreferences() {
    localStorage.setItem('notification-preferences', JSON.stringify(this.preferences));
  }

  private saveRules() {
    const rules = Array.from(this.rules.values());
    localStorage.setItem('notification-rules', JSON.stringify(rules));
  }

  private notifyListeners() {
    const notifications = this.getNotifications();
    this.listeners.forEach(listener => listener(notifications));
  }

  private async playSound() {
    if (this.preferences.sound && this.soundEnabled) {
      try {
        await this.notificationSound.play();
      } catch (error) {
        console.error('Failed to play notification sound:', error);
      }
    }
  }

  private async showDesktopNotification(notification: Notification) {
    if (!this.preferences.desktop || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      const desktopNotif = new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
      });

      desktopNotif.onclick = () => {
        window.focus();
        this.markAsRead(notification.id);
        
        // Handle notification actions
        if (notification.source?.type === 'chat' && notification.source.id) {
          window.location.href = `/chat/${notification.source.id}`;
        }
      };
    }
  }

  private shouldNotify(notification: Notification): boolean {
    if (!this.preferences.enabled) return false;

    // Check type filter
    if (!this.preferences.filters.types[notification.type]) return false;

    // Check priority filter
    if (!this.preferences.filters.priorities[notification.priority]) return false;

    // Check quiet hours
    if (this.preferences.quietHours?.enabled) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startHour, startMin] = this.preferences.quietHours.start.split(':').map(Number);
      const [endHour, endMin] = this.preferences.quietHours.end.split(':').map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      if (startTime <= endTime) {
        // Normal case: quiet hours don't cross midnight
        if (currentTime >= startTime && currentTime <= endTime) return false;
      } else {
        // Quiet hours cross midnight
        if (currentTime >= startTime || currentTime <= endTime) return false;
      }
    }

    return true;
  }

  private async processRules(notification: Notification) {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check if all conditions match
      const allConditionsMatch = rule.conditions.every(condition => {
        const value = this.getFieldValue(notification, condition.field);
        return this.evaluateCondition(value, condition);
      });

      if (allConditionsMatch) {
        // Execute rule actions
        for (const action of rule.actions) {
          await this.executeRuleAction(action, notification);
        }
      }
    }
  }

  private getFieldValue(notification: Notification, field: string): any {
    const parts = field.split('.');
    let value: any = notification;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return value;
  }

  private evaluateCondition(value: any, condition: any): boolean {
    const { operator, value: conditionValue, caseSensitive } = condition;
    
    let testValue = value;
    let testConditionValue = conditionValue;
    
    if (!caseSensitive && typeof value === 'string' && typeof conditionValue === 'string') {
      testValue = value.toLowerCase();
      testConditionValue = conditionValue.toLowerCase();
    }

    switch (operator) {
      case 'equals':
        return testValue === testConditionValue;
      case 'contains':
        return String(testValue).includes(String(testConditionValue));
      case 'startsWith':
        return String(testValue).startsWith(String(testConditionValue));
      case 'endsWith':
        return String(testValue).endsWith(String(testConditionValue));
      case 'regex':
        return new RegExp(testConditionValue).test(String(testValue));
      case 'in':
        return Array.isArray(testConditionValue) && testConditionValue.includes(testValue);
      case 'notIn':
        return Array.isArray(testConditionValue) && !testConditionValue.includes(testValue);
      default:
        return false;
    }
  }

  private async executeRuleAction(action: any, notification: Notification) {
    switch (action.type) {
      case 'notify':
        // Already handled by default notification flow
        break;
      case 'email':
        // Send email notification (would require backend integration)
        console.log('Email notification:', notification);
        break;
      case 'webhook':
        // Send webhook notification
        if (action.config.url) {
          try {
            await fetch(action.config.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(notification),
            });
          } catch (error) {
            console.error('Webhook notification failed:', error);
          }
        }
        break;
      case 'log':
        console.log('Rule-triggered notification:', notification);
        break;
      case 'custom':
        // Execute custom action
        if (action.config.handler && typeof window[action.config.handler] === 'function') {
          window[action.config.handler](notification);
        }
        break;
    }
  }

  private setupBackgroundSync() {
    // Clean up expired notifications every 5 minutes
    setInterval(() => {
      this.cleanupExpiredNotifications();
    }, 5 * 60 * 1000);
  }

  private cleanupExpiredNotifications() {
    const now = new Date();
    let changed = false;

    for (const [id, notification] of this.notifications.entries()) {
      if (notification.expiresAt && notification.expiresAt < now) {
        this.notifications.delete(id);
        changed = true;
      }
    }

    if (changed) {
      this.saveNotifications();
      this.notifyListeners();
    }
  }

  // Public API
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  async notify(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<string> {
    const id = generateUUID();
    const fullNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false,
    };

    // Check if notification should be shown
    if (!this.shouldNotify(fullNotification)) {
      return id;
    }

    // Add to store
    this.notifications.set(id, fullNotification);
    this.saveNotifications();

    // Process rules
    await this.processRules(fullNotification);

    // Show notifications through enabled channels
    if (this.channels.get('browser')?.enabled) {
      await this.showDesktopNotification(fullNotification);
      await this.playSound();

      // Show toast notification
      const toastOptions: any = {
        description: fullNotification.message,
        duration: fullNotification.priority === 'urgent' ? 10000 : 5000,
      };

      if (fullNotification.actions && fullNotification.actions.length > 0) {
        const primaryAction = fullNotification.actions.find(a => a.primary) || fullNotification.actions[0];
        toastOptions.action = {
          label: primaryAction.label,
          onClick: () => this.handleAction(id, primaryAction),
        };
      }

      switch (fullNotification.type) {
        case 'success':
          toast.success(fullNotification.title, toastOptions);
          break;
        case 'error':
          toast.error(fullNotification.title, toastOptions);
          break;
        case 'warning':
          toast.warning(fullNotification.title, toastOptions);
          break;
        default:
          toast(fullNotification.title, toastOptions);
      }
    }

    this.notifyListeners();
    return id;
  }

  markAsRead(id: string) {
    const notification = this.notifications.get(id);
    if (notification && !notification.read) {
      notification.read = true;
      this.saveNotifications();
      this.notifyListeners();
    }
  }

  markAllAsRead() {
    let changed = false;
    for (const notification of this.notifications.values()) {
      if (!notification.read) {
        notification.read = true;
        changed = true;
      }
    }
    
    if (changed) {
      this.saveNotifications();
      this.notifyListeners();
    }
  }

  delete(id: string) {
    if (this.notifications.delete(id)) {
      this.saveNotifications();
      this.notifyListeners();
    }
  }

  clearAll() {
    this.notifications.clear();
    this.saveNotifications();
    this.notifyListeners();
  }

  getNotifications(filter?: NotificationFilter): Notification[] {
    let notifications = Array.from(this.notifications.values());

    if (filter) {
      notifications = notifications.filter(notif => {
        if (filter.types && !filter.types.includes(notif.type)) return false;
        if (filter.priorities && !filter.priorities.includes(notif.priority)) return false;
        if (filter.read !== undefined && notif.read !== filter.read) return false;
        
        if (filter.dateRange) {
          if (notif.timestamp < filter.dateRange.start || notif.timestamp > filter.dateRange.end) {
            return false;
          }
        }

        if (filter.sources && notif.source) {
          if (!filter.sources.includes(notif.source.type)) return false;
        }

        return true;
      });
    }

    // Sort by timestamp, newest first
    return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getUnreadCount(): number {
    return Array.from(this.notifications.values()).filter(n => !n.read).length;
  }

  updatePreferences(preferences: Partial<NotificationPreferences>) {
    this.preferences = { ...this.preferences, ...preferences };
    this.savePreferences();
  }

  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  addRule(rule: Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = generateUUID();
    const fullRule: NotificationRule = {
      ...rule,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.rules.set(id, fullRule);
    this.saveRules();
    return id;
  }

  updateRule(id: string, updates: Partial<NotificationRule>) {
    const rule = this.rules.get(id);
    if (rule) {
      this.rules.set(id, {
        ...rule,
        ...updates,
        updatedAt: new Date(),
      });
      this.saveRules();
    }
  }

  deleteRule(id: string) {
    if (this.rules.delete(id)) {
      this.saveRules();
    }
  }

  getRules(): NotificationRule[] {
    return Array.from(this.rules.values());
  }

  subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  private handleAction(notificationId: string, action: any) {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;

    this.markAsRead(notificationId);

    // Handle different action types
    switch (action.action) {
      case 'navigate':
        if (action.data?.url) {
          window.location.href = action.data.url;
        }
        break;
      case 'callback':
        if (action.data?.handler && typeof window[action.data.handler] === 'function') {
          window[action.data.handler](notification, action);
        }
        break;
      default:
        console.log('Unhandled notification action:', action);
    }
  }
}