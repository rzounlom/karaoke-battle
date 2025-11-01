"use client";

import { useEffect, useState } from "react";

interface BattleNotification {
  id: string;
  challengerName: string;
  challengerAvatar: string | null;
  songTitle: string;
  songArtist: string;
  songId: string;
  createdAt: string;
  expiresAt: string | null;
  status: "pending_sent" | "pending_received"; // Track if user sent or received
  participants: Array<{
    userId: string;
    user: {
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      avatar: string | null;
    };
    status: string;
  }>;
}

export function useChallengeNotifications() {
  const [notifications, setNotifications] = useState<
    BattleNotification[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const response = await fetch("/api/challenges");
      const data = await response.json();

      if (data.success) {
        const pendingReceived = data.pendingReceived || [];
        const pendingSent = data.pendingSent || [];
        
        // Format received notifications
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const receivedNotifications = pendingReceived.map((challenge: any) => ({
          id: challenge.id,
          challengerName:
            challenge.challenger.username ||
            `${challenge.challenger.firstName || ""} ${challenge.challenger.lastName || ""}`.trim() ||
            "Unknown User",
          challengerAvatar: challenge.challenger.avatar,
          songTitle: challenge.song.title,
          songArtist: challenge.song.artist,
          songId: challenge.song.customId || challenge.song.id,
          createdAt: challenge.createdAt,
          expiresAt: challenge.expiresAt,
          status: "pending_received" as const,
          participants: challenge.participants || [],
        }));

        // Format sent notifications
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sentNotifications = pendingSent.map((challenge: any) => ({
          id: challenge.id,
          challengerName:
            challenge.challenger.username ||
            `${challenge.challenger.firstName || ""} ${challenge.challenger.lastName || ""}`.trim() ||
            "Unknown User",
          challengerAvatar: challenge.challenger.avatar,
          songTitle: challenge.song.title,
          songArtist: challenge.song.artist,
          songId: challenge.song.customId || challenge.song.id,
          createdAt: challenge.createdAt,
          expiresAt: challenge.expiresAt,
          status: "pending_sent" as const,
          participants: challenge.participants || [],
        }));

        // Combine both, received first
        const formattedNotifications = [...receivedNotifications, ...sentNotifications];
        setNotifications(formattedNotifications);
        // Count only received as unread (since you can't accept your own requests)
        setUnreadCount(receivedNotifications.length);
      }
    } catch (error) {
      console.error("Error loading battle notifications:", error);
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

