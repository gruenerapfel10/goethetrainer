import { useState, useEffect, useCallback } from 'react';
import { NotificationService } from '@/lib/notifications/notification-service';
import type { Notification, NotificationFilter } from '@/lib/notifications/types';

export function useNotifications(filter?: NotificationFilter) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    // Load initial notifications
    const updateState = () => {
      setNotifications(notificationService.getNotifications(filter));
      setUnreadCount(notificationService.getUnreadCount());
    };

    updateState();

    // Subscribe to updates
    const unsubscribe = notificationService.subscribe(() => {
      updateState();
    });

    return unsubscribe;
  }, [filter]);

  const notify = useCallback(async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    return await notificationService.notify(notification);
  }, []);

  const markAsRead = useCallback((id: string) => {
    notificationService.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    notificationService.markAllAsRead();
  }, []);

  const deleteNotification = useCallback((id: string) => {
    notificationService.delete(id);
  }, []);

  const clearAll = useCallback(() => {
    notificationService.clearAll();
  }, []);

  return {
    notifications,
    unreadCount,
    notify,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}

// Hook for smart notifications based on chat events
export function useChatNotifications(chatId: string) {
  const { notify } = useNotifications();
  
  const notifyMention = useCallback(async (message: string, sender: string) => {
    return await notify({
      type: 'mention',
      title: `${sender} mentioned you`,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      priority: 'high',
      source: {
        type: 'chat',
        id: chatId,
        name: sender,
      },
      actions: [
        {
          label: 'View',
          action: 'navigate',
          primary: true,
          data: { url: `/chat/${chatId}` },
        },
      ],
    });
  }, [chatId, notify]);

  const notifyImportantMessage = useCallback(async (message: string, reason: string) => {
    return await notify({
      type: 'info',
      title: 'Important Message',
      message: `${reason}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
      priority: 'high',
      source: {
        type: 'chat',
        id: chatId,
      },
      actions: [
        {
          label: 'View',
          action: 'navigate',
          primary: true,
          data: { url: `/chat/${chatId}` },
        },
      ],
    });
  }, [chatId, notify]);

  const notifyTaskCreated = useCallback(async (taskTitle: string, dueDate?: Date) => {
    return await notify({
      type: 'task',
      title: 'New Task Created',
      message: taskTitle,
      priority: 'medium',
      source: {
        type: 'chat',
        id: chatId,
      },
      metadata: {
        dueDate,
      },
      actions: [
        {
          label: 'View Task',
          action: 'navigate',
          primary: true,
          data: { url: `/chat/${chatId}` },
        },
      ],
    });
  }, [chatId, notify]);

  return {
    notifyMention,
    notifyImportantMessage,
    notifyTaskCreated,
  };
}

// Hook for connector notifications
export function useConnectorNotifications() {
  const { notify } = useNotifications();

  const notifyConnectorEvent = useCallback(async (
    connectorName: string,
    event: string,
    details?: string
  ) => {
    return await notify({
      type: 'info',
      title: `${connectorName} Update`,
      message: details || event,
      priority: 'low',
      source: {
        type: 'connector',
        name: connectorName,
      },
    });
  }, [notify]);

  const notifyConnectorError = useCallback(async (
    connectorName: string,
    error: string
  ) => {
    return await notify({
      type: 'error',
      title: `${connectorName} Error`,
      message: error,
      priority: 'high',
      source: {
        type: 'connector',
        name: connectorName,
      },
    });
  }, [notify]);

  return {
    notifyConnectorEvent,
    notifyConnectorError,
  };
}