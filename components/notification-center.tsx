'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, Trash2, Filter, Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { NotificationService } from '@/lib/notifications/notification-service';
import type { AppNotification, NotificationFilter } from '@/lib/notifications/types';
import { formatDistanceToNow } from 'date-fns';
import { NotificationSettings } from './notification-settings';

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    // Load initial notifications
    updateNotifications();

    // Subscribe to updates
    const unsubscribe = notificationService.subscribe(() => {
      updateNotifications();
    });

    // Request permission
    notificationService.requestPermission();

    return () => {
      unsubscribe();
    };
  }, [filter]);

  const updateNotifications = () => {
    const filtered = notificationService.getNotifications(filter);
    setNotifications(filtered);
    setUnreadCount(notificationService.getUnreadCount());
  };

  const handleMarkAsRead = (id: string) => {
    notificationService.markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const handleDelete = (id: string) => {
    notificationService.delete(id);
  };

  const handleClearAll = () => {
    notificationService.clearAll();
  };

  const toggleSound = () => {
    const newSoundEnabled = !soundEnabled;
    setSoundEnabled(newSoundEnabled);
    notificationService.setSoundEnabled(newSoundEnabled);
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
    const icons = {
      info: '💡',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      mention: '@',
      task: '📋',
      reminder: '⏰',
    };
    return icons[type] || '📬';
  };

  const getPriorityColor = (priority: AppNotification['priority']) => {
    const colors = {
      low: 'text-muted-foreground',
      medium: 'text-foreground',
      high: 'text-orange-500',
      urgent: 'text-red-500',
    };
    return colors[priority] || 'text-foreground';
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[400px] max-h-[600px] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSound}
              className="h-8 w-8"
            >
              {soundEnabled ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilter({})}>
                  All Notifications
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter({ read: false })}>
                  Unread Only
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilter({ priorities: ['high', 'urgent'] })}>
                  High Priority
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter({ types: ['mention'] })}>
                  Mentions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter({ types: ['task'] })}>
                  Tasks
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <NotificationSettings />
          </div>
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
            <Button
              variant="link"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-auto p-0 text-xs"
            >
              Mark all as read
            </Button>
            <Button
              variant="link"
              size="sm"
              onClick={handleClearAll}
              className="h-auto p-0 text-xs text-destructive"
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'group relative p-4 border-b hover:bg-muted/50 transition-colors',
                    !notification.read && 'bg-primary/5'
                  )}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 text-2xl">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={cn(
                            'font-medium text-sm',
                            getPriorityColor(notification.priority)
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1 break-words">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                            {notification.source && (
                              <span className="ml-2">
                                from {notification.source.name || notification.source.type}
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Unread indicator */}
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>

                      {/* Actions */}
                      {notification.actions && notification.actions.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {notification.actions.map((action, index) => (
                            <Button
                              key={index}
                              variant={action.primary ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                // Handle action
                                console.log('Action clicked:', action);
                              }}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick actions */}
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDelete(notification.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}