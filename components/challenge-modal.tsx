"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Sword, X } from "lucide-react";
import { Song, getAllSongs } from "@/lib/songs-data";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";

interface Friend {
  id: string;
  name: string;
  avatar: string | null;
}

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends: Friend[]; // Changed from single friend to array
}

export function ChallengeModal({
  isOpen,
  onClose,
  friends,
}: ChallengeModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const allSongs = getAllSongs();

  // Filter songs based on search
  const filteredSongs = allSongs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClose = useCallback(() => {
    setSearchTerm("");
    setSelectedSong(null);
    onClose();
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleChallenge = async () => {
    if (!selectedSong) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/challenges/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendIds: friends.map((f) => f.id),
          songId: selectedSong.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        handleClose();
        const friendNames = friends.map((f) => f.name).join(", ");
        toast.success(
          `Challenge sent to ${friendNames}!`,
          `${friends.length > 1 ? "They" : "They"} have 24 hours to accept.`
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
                Challenge {friends.length} Friend{friends.length > 1 ? "s" : ""}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Select a song to battle on
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

        {/* Friends Info */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-3">
            {friends.map((friend) => (
              <div key={friend.id} className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={friend.avatar || undefined} />
                  <AvatarFallback>
                    {friend.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="font-medium text-sm text-gray-900 dark:text-white">
                  {friend.name}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Choose a song to challenge {friends.length > 1 ? "them" : "them"} to
          </p>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search songs by title or artist..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Song List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredSongs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No songs found matching &quot;{searchTerm}&quot;
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredSongs.map((song) => (
                <Card
                  key={song.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedSong?.id === song.id
                      ? "ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                  onClick={() => setSelectedSong(song)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {song.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {song.artist}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                            {song.genre}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              song.difficulty === "Easy"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : song.difficulty === "Medium"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {song.difficulty}
                          </span>
                        </div>
                      </div>
                      {selectedSong?.id === song.id && (
                        <div className="ml-2 flex-shrink-0">
                          <div className="h-6 w-6 rounded-full bg-purple-500 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            {selectedSong && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Selected:{" "}
                <span className="font-medium">{selectedSong.title}</span> by{" "}
                <span className="font-medium">{selectedSong.artist}</span>
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleChallenge}
              disabled={!selectedSong || isCreating}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isCreating ? "Sending..." : "Send Challenge"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
