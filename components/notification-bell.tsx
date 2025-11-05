"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Check, X, Sword } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useFriendRequestNotifications } from "@/hooks/use-friend-request-notifications";
import { useChallengeNotifications } from "@/hooks/use-challenge-notifications";
import { useState, useEffect, useRef } from "react";
import { toast } from "@/lib/toast";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"friends" | "challenges">("friends");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const { 
    notifications: friendNotifications, 
    unreadCount: friendUnreadCount, 
    markAsRead: markFriendsRead, 
    loadNotifications: loadFriendNotifications 
  } = useFriendRequestNotifications();
  
  const { 
    notifications: challengeNotifications, 
    unreadCount: challengeUnreadCount, 
    markAsRead: markChallengesRead, 
    loadNotifications: loadChallengeNotifications,
    removeNotification: removeChallengeNotification
  } = useChallengeNotifications();
  
  const totalUnreadCount = friendUnreadCount + challengeUnreadCount;

  const respondToFriendRequest = async (
    friendshipId: string,
    action: "accept" | "reject"
  ) => {
    try {
      const response = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh notifications by reloading them
        loadFriendNotifications();
        // Close the notification dropdown
        setIsOpen(false);
        toast.success(data.message || "Friend request processed successfully");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error responding to friend request:", error);
      toast.error("Failed to respond to friend request");
    }
  };

  const respondToChallenge = async (
    challengeId: string,
    action: "accept" | "decline"
  ) => {
    try {
      const response = await fetch(`/api/challenges/${challengeId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        // Immediately remove from notifications UI
        removeChallengeNotification(challengeId);
        // Refresh notifications to ensure consistency
        loadChallengeNotifications();
        // Close the notification dropdown
        setIsOpen(false);
        const actionText = action === "accept" ? "accepted" : "declined";
        toast.success(`Challenge ${actionText}!`, data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error responding to challenge:", error);
      toast.error("Failed to respond to challenge");
    }
  };

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (totalUnreadCount > 0) {
      if (activeTab === "friends" && friendUnreadCount > 0) {
        markFriendsRead();
      } else if (activeTab === "challenges" && challengeUnreadCount > 0) {
        markChallengesRead();
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    // Handle ESC key
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        onClick={handleBellClick}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {totalUnreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
        >
          <Card className="border-0 shadow-none">
            <CardContent className="p-0">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                  <Link href={activeTab === "friends" ? "/friends" : "/battles"}>
                    <Button variant="ghost" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
                
                {/* Tabs */}
                <div className="flex space-x-2">
                  <Button
                    variant={activeTab === "friends" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setActiveTab("friends");
                      if (friendUnreadCount > 0) markFriendsRead();
                    }}
                    className="flex-1"
                  >
                    Friends {friendUnreadCount > 0 && `(${friendUnreadCount})`}
                  </Button>
                  <Button
                    variant={activeTab === "challenges" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setActiveTab("challenges");
                      if (challengeUnreadCount > 0) markChallengesRead();
                    }}
                    className="flex-1"
                  >
                    <Sword className="h-3 w-3 mr-1" />
                    Battles {challengeUnreadCount > 0 && `(${challengeUnreadCount})`}
                  </Button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {activeTab === "friends" ? (
                  friendNotifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No friend requests</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {friendNotifications.map((notification) => (
                        <div key={notification.id} className="p-4">
                          <div className="flex items-start space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={notification.senderAvatar} />
                              <AvatarFallback>
                                {notification.senderName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 dark:text-white">
                                <span className="font-medium">
                                  {notification.senderName}
                                </span>{" "}
                                sent you a friend request
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(
                                  notification.createdAt
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  respondToFriendRequest(
                                    notification.id,
                                    "accept"
                                  )
                                }
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  respondToFriendRequest(
                                    notification.id,
                                    "reject"
                                  )
                                }
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  challengeNotifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <Sword className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No battle requests</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {challengeNotifications.map((notification) => {
                        const isSent = notification.status === "pending_sent";
                        // For sent battles, show participants with PENDING status (those being challenged)
                        // For received battles, we just show the challenger
                        const participantNames = isSent && notification.participants
                          ? notification.participants
                              .filter((p) => p.status === "PENDING")
                              .map((p) => p.user.username || 
                                `${p.user.firstName || ""} ${p.user.lastName || ""}`.trim() || 
                                "Unknown")
                          : [];
                        
                        return (
                          <div key={notification.id} className="p-4">
                            <div className="flex items-start space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={notification.challengerAvatar || undefined} />
                                <AvatarFallback>
                                  {notification.challengerName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                {isSent ? (
                                  <>
                                    <p className="text-sm text-gray-900 dark:text-white">
                                      You challenged{" "}
                                      <span className="font-medium">
                                        {participantNames.length > 0 
                                          ? participantNames.length > 2
                                            ? `${participantNames.slice(0, 2).join(", ")} and ${participantNames.length - 2} more`
                                            : participantNames.join(" and ")
                                          : "friends"}
                                      </span>{" "}
                                      to battle!
                                    </p>
                                    <Badge variant="outline" className="mt-1 text-xs">
                                      Pending
                                    </Badge>
                                  </>
                                ) : (
                                  <p className="text-sm text-gray-900 dark:text-white">
                                    <span className="font-medium">
                                      {notification.challengerName}
                                    </span>{" "}
                                    challenged you to battle!
                                  </p>
                                )}
                                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-1">
                                  {notification.songTitle} by {notification.songArtist}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(
                                    notification.createdAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              {!isSent && (
                                <div className="flex space-x-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      respondToChallenge(
                                        notification.id,
                                        "accept"
                                      )
                                    }
                                    className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                    title="Accept Battle"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      respondToChallenge(
                                        notification.id,
                                        "decline"
                                      )
                                    }
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    title="Decline Battle"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
