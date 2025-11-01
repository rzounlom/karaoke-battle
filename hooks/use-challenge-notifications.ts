"use client";

import { useEffect, useState } from "react";

interface ChallengeNotification {
  id: string;
  challengerName: string;
  challengerAvatar: string | null;
  songTitle: string;
  songArtist: string;
  songId: string;
  createdAt: string;
  expiresAt: string | null;
}

export function useChallengeNotifications() {
  const [notifications, setNotifications] = useState<
    ChallengeNotification[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const response = await fetch("/api/challenges");
      const data = await response.json();

      if (data.success) {
        const pendingReceived = data.pendingReceived || [];
        // Format notifications with proper challenger name
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedNotifications = pendingReceived.map((challenge: any) => ({
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
        }));
        setNotifications(formattedNotifications);
        setUnreadCount(formattedNotifications.length);
      }
    } catch (error) {
      console.error("Error loading challenge notifications:", error);
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

