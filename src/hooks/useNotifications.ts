import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema } from '@capacitor/push-notifications';

export type NotificationType =
  | 'pulse_join'
  | 'pulse_leave'
  | 'pulse_reminder'
  | 'pulse_cancelled'
  | 'new_rating'
  | 'new_message'
  | 'pulse_nearby';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  pulse_join: boolean;
  pulse_leave: boolean;
  pulse_reminder: boolean;
  pulse_cancelled: boolean;
  new_rating: boolean;
  new_message: boolean;
  pulse_nearby: boolean;
}

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const transformed: AppNotification[] = (data || []).map(n => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data || {},
        read: n.read,
        createdAt: n.created_at
      }));

      setNotifications(transformed);
      setUnreadCount(transformed.filter(n => !n.read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  // Register device token for push notifications
  const registerPushToken = async (token: string, platform: 'ios' | 'android' | 'web') => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('device_tokens')
        .upsert({
          user_id: userId,
          token,
          platform,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,token'
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error registering push token:', err);
    }
  };

  // Initialize push notifications (native only)
  const initializePushNotifications = async () => {
    if (!Capacitor.isNativePlatform()) {
      // Web push not implemented yet
      return;
    }

    try {
      // Request permission
      const permStatus = await PushNotifications.requestPermissions();

      if (permStatus.receive === 'granted') {
        setPermissionGranted(true);

        // Register with Apple/Google
        await PushNotifications.register();

        // Listen for registration success
        PushNotifications.addListener('registration', (token: Token) => {
          const platform = Capacitor.getPlatform() as 'ios' | 'android';
          registerPushToken(token.value, platform);
        });

        // Listen for push notifications received
        PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
          // Refresh notifications when one is received
          fetchNotifications();
        });

        // Listen for notification action (tap)
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          // Handle notification tap - could navigate to specific screen
          const data = action.notification.data;
          console.log('Notification tapped:', data);
        });
      }
    } catch (err) {
      console.error('Error initializing push notifications:', err);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Initialize push on mount
  useEffect(() => {
    if (userId) {
      initializePushNotifications();
    }
  }, [userId]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notifications_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotif: AppNotification = {
            id: payload.new.id,
            userId: payload.new.user_id,
            type: payload.new.type,
            title: payload.new.title,
            body: payload.new.body,
            data: payload.new.data || {},
            read: payload.new.read,
            createdAt: payload.new.created_at
          };
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    notifications,
    unreadCount,
    loading,
    permissionGranted,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications,
    initializePushNotifications
  };
}
