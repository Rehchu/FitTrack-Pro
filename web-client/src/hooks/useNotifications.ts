import { useState, useCallback } from 'react';

export interface Notification {
  id?: string;
  title: string;
  body: string;
  type: 'message' | 'videoCall' | 'achievement' | 'info';
  data?: any;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notification: Notification) => {
    const id = Math.random().toString(36).substring(7);
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);

    // Auto remove after 5 seconds unless it's a video call
    if (notification.type !== 'videoCall') {
      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    }

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: '/icon-192.png',
      });
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    showNotification,
    removeNotification,
  };
}