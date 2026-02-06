import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppNotification } from '../src/hooks/useNotifications';

interface NotificationsPanelProps {
  isOpen: boolean;
  notifications: AppNotification[];
  onClose: () => void;
  onNotificationClick: (notification: AppNotification) => void;
  onMarkAllRead: () => void;
}

const getNotificationIcon = (type: AppNotification['type']) => {
  switch (type) {
    case 'pulse_join':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-green-500">
          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="8.5" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="20" y1="8" x2="20" y2="14" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="23" y1="11" x2="17" y2="11" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'pulse_leave':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-orange-500">
          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="8.5" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="23" y1="11" x2="17" y2="11" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'new_rating':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-amber-500">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      );
    case 'new_message':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-blue-500">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'pulse_reminder':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-violet-500">
          <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="12,6 12,12 16,14" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'pulse_cancelled':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-red-500">
          <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-violet-500">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
  }
};

const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen,
  notifications,
  onClose,
  onNotificationClick,
  onMarkAllRead
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-violet-950">
              <div>
                <h2 className="text-2xl font-black text-white">Notifications</h2>
                {unreadCount > 0 && (
                  <p className="text-violet-300 text-sm font-bold">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Mark all read button */}
            {unreadCount > 0 && (
              <div className="p-4 border-b border-gray-50">
                <button
                  onClick={onMarkAllRead}
                  className="text-violet-600 font-bold text-sm hover:text-violet-800 transition-colors"
                >
                  Tout marquer comme lu
                </button>
              </div>
            )}

            {/* Notifications list */}
            <div className="overflow-y-auto h-[calc(100vh-140px)] scrollbar-hide">
              {notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10 text-violet-300">
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="text-gray-400 font-bold">Aucune notification</p>
                  <p className="text-gray-300 text-sm mt-2">Tu seras notifié des nouvelles activités ici</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notification) => (
                    <motion.button
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => onNotificationClick(notification)}
                      className={`w-full p-5 flex gap-4 text-left transition-colors hover:bg-gray-50 ${
                        !notification.read ? 'bg-violet-50/50' : ''
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        !notification.read ? 'bg-white shadow-lg' : 'bg-gray-100'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-bold text-gray-900 leading-tight ${!notification.read ? 'text-violet-950' : ''}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2.5 h-2.5 bg-violet-600 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">{notification.body}</p>
                        <p className="text-gray-300 text-xs font-bold mt-2">{getTimeAgo(notification.createdAt)}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationsPanel;
