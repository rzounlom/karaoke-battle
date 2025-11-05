"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Sword, Users, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";

interface Friend {
  id: string;
  friendId: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string;
  level: number;
  experience: number;
  status: string;
}

interface MultiplayerFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  songId: string;
  songTitle: string;
  songArtist: string;
}

export function MultiplayerFriendModal({
  isOpen,
  onClose,
  songId,
  songTitle,
  songArtist,
}: MultiplayerFriendModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Load friends when modal opens
  useEffect(() => {
    if (isOpen) {
      loadFriends();
    }
  }, [isOpen]);

  const loadFriends = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/friends");
      const data = await response.json();

      if (data.success && data.acceptedFriends) {
        setFriends(data.acceptedFriends);
      }
    } catch (error) {
      console.error("Error loading friends:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter friends based on search
  const filteredFriends = friends.filter((friend) => {
    const displayName =
      friend.username ||
      `${friend.firstName || ""} ${friend.lastName || ""}`.trim();
    return displayName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleClose = useCallback(() => {
    setSearchTerm("");
    setSelectedFriendIds(new Set());
    onClose();
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleChallenge = async () => {
    if (selectedFriendIds.size === 0) return;

    setIsCreating(true);
    try {
      const selectedFriends = friends.filter((f) =>
        selectedFriendIds.has(f.friendId)
      );

      const response = await fetch("/api/challenges/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendIds: Array.from(selectedFriendIds),
          songId: songId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        handleClose();
        const friendNames = selectedFriends
          .map((f) => f.username || f.firstName)
          .join(", ");
        toast.success(
          `Challenge sent to ${friendNames}!`,
          `They have 3 days to accept the challenge.`
        );
      } else {
        toast.error(data.message || "Failed to create challenge");
      }
    } catch (error) {
      console.error("Error creating challenge:", error);
      toast.error("Failed to create challenge", "Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <Sword className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Challenge Friend{selectedFriendIds.size !== 1 ? "s" : ""}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                {songTitle} by {songArtist}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Song Info */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
              <Sword className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Battle Song
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                {songTitle} by {songArtist}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search friends..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">
                Loading friends...
              </p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-12">
              {friends.length === 0 ? (
                <>
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-900 dark:text-white font-medium mb-2">
                    No Friends Yet
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                    Add friends to challenge them to battles!
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleClose();
                      // Could navigate to friends page here
                      window.location.href = "/friends";
                    }}
                  >
                    Go to Friends
                  </Button>
                </>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  No friends found matching &quot;{searchTerm}&quot;
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {selectedFriendIds.size > 0 && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mb-3">
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
                    {selectedFriendIds.size} friend
                    {selectedFriendIds.size > 1 ? "s" : ""} selected
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredFriends.map((friend) => {
                  const displayName =
                    friend.username ||
                    `${friend.firstName || ""} ${friend.lastName || ""}`.trim();
                  const isSelected = selectedFriendIds.has(friend.friendId);

                  return (
                    <Card
                      key={friend.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        isSelected
                          ? "ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                      onClick={() => {
                        const newSelected = new Set(selectedFriendIds);
                        if (isSelected) {
                          newSelected.delete(friend.friendId);
                        } else {
                          newSelected.add(friend.friendId);
                        }
                        setSelectedFriendIds(newSelected);
                      }}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newSelected = new Set(selectedFriendIds);
                                if (e.target.checked) {
                                  newSelected.add(friend.friendId);
                                } else {
                                  newSelected.delete(friend.friendId);
                                }
                                setSelectedFriendIds(newSelected);
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500 flex-shrink-0"
                            />
                            <Avatar className="h-12 w-12 flex-shrink-0">
                              <AvatarImage src={friend.avatar || undefined} />
                              <AvatarFallback>
                                {displayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                {displayName}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  Level {friend.level}
                                </Badge>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {friend.experience} XP
                                </span>
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="ml-2 flex-shrink-0">
                              <div className="h-6 w-6 rounded-full bg-purple-500 flex items-center justify-center">
                                <div className="h-2 w-2 rounded-full bg-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            {selectedFriendIds.size > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedFriendIds.size} friend
                {selectedFriendIds.size > 1 ? "s" : ""} selected
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleChallenge}
              disabled={selectedFriendIds.size === 0 || isCreating}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isCreating
                ? "Sending..."
                : `Send Challenge${selectedFriendIds.size > 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
