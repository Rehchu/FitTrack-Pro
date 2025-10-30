import { ReactNode, createContext, useContext } from 'react';
import { Notification, useNotifications } from '../hooks/useNotifications';

interface NotificationsContextType {
  notifications: Notification[];
  showNotification: (notification: Notification) => string;
  removeNotification: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const notificationsData = useNotifications();

  return (
    <NotificationsContext.Provider value={notificationsData}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {notificationsData.notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ease-in-out
              ${notification.type === 'videoCall' ? 'bg-red-500 text-white' :
                notification.type === 'message' ? 'bg-blue-500 text-white' :
                notification.type === 'achievement' ? 'bg-yellow-500 text-white' :
                'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
              }`}
            role="alert"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold">{notification.title}</h4>
                <p className="text-sm mt-1">{notification.body}</p>
              </div>
              <button
                onClick={() => notification.id && notificationsData.removeNotification(notification.id)}
                className="ml-4 text-white hover:text-gray-200"
                aria-label="Close notification"
              >
                ✕
              </button>
            </div>
            {notification.type === 'videoCall' && (
              <div className="mt-2 flex space-x-2">
                <button
                  className="flex-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded"
                  onClick={() => {
                    // Handle accept video call
                    notification.id && notificationsData.removeNotification(notification.id);
                  }}
                >
                  Accept
                </button>
                <button
                  className="flex-1 px-3 py-1 bg-red-600 hover:bg-red-700 rounded"
                  onClick={() => {
                    // Handle decline video call
                    notification.id && notificationsData.removeNotification(notification.id);
                  }}
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotificationsContext must be used within NotificationsProvider');
  }
  return context;
}