"use client";

import { useEffect, useState } from "react";

interface FriendRequestNotification {
  id: string;
  senderName: string;
  senderAvatar: string;
  createdAt: string;
}

export function useFriendRequestNotifications() {
  const [notifications, setNotifications] = useState<
    FriendRequestNotification[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const response = await fetch("/api/friends");
      const data = await response.json();

      if (data.success) {
        const pendingReceived = data.pendingReceived || [];
        // Format notifications with proper senderName prioritizing username
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedNotifications = pendingReceived.map((request: any) => ({
          id: request.id,
          senderName:
            request.username ||
            `${request.firstName || ""} ${request.lastName || ""}`.trim() ||
            "Unknown User",
          senderAvatar: request.avatar,
          createdAt: request.createdAt,
        }));
        setNotifications(formattedNotifications);
        setUnreadCount(formattedNotifications.length);
      }
    } catch (error) {
      console.error("Error loading friend request notifications:", error);
    }
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  useEffect(() => {
    loadNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    unreadCount,
    loadNotifications,
    markAsRead,
  };
}
