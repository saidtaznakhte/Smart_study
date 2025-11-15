export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn("This browser does not support desktop notification.");
    return 'denied'; // Treat as denied if not supported
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  // Request permission if not already granted or denied
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return 'denied';
  }
};

export const showBrowserNotification = (title: string, body: string, icon?: string) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body: body,
      icon: icon || '/icons/icon-192x192.png', // Default icon
    });
  }
};