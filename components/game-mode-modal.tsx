"use client";

import { Mic, Trophy, Users, X } from "lucide-react";
import { useCallback, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface GameModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  songId: string;
  songTitle: string;
  songArtist: string;
}

const gameModes = [
  {
    id: "single",
    title: "Single Player",
    description: "Practice on your own and improve your skills",
    icon: Mic,
    color: "from-blue-500 to-cyan-500",
    players: "1 player",
  },
  {
    id: "multiplayer",
    title: "Multiplayer",
    description: "Battle against friends in real-time",
    icon: Users,
    color: "from-purple-500 to-pink-500",
    players: "2-8 players",
  },
  {
    id: "tournament",
    title: "Tournament",
    description: "Compete in organized tournaments",
    icon: Trophy,
    color: "from-yellow-500 to-orange-500",
    players: "8-32 players",
  },
];

export function GameModeModal({
  isOpen,
  onClose,
  songId,
  songTitle,
  songArtist,
}: GameModeModalProps) {
  const router = useRouter();

  const handleModeSelect = (modeId: string) => {
    // Navigate to gameplay with the selected mode
    router.push(`/gameplay?songId=${songId}&mode=${modeId}`);
  };

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
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
      // Prevent body scroll when modal is open
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
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Choose Game Mode
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {songTitle} by {songArtist}
            </p>
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

        {/* Game Mode Cards */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {gameModes.map((mode) => {
              const IconComponent = mode.icon;
              return (
                <div
                  key={mode.id}
                  className="relative group cursor-pointer"
                  onClick={() => handleModeSelect(mode.id)}
                >
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-600 transition-all duration-200 hover:shadow-lg hover:scale-105 group-hover:border-purple-300 dark:group-hover:border-purple-500">
                    {/* Icon */}
                    <div
                      className={`w-16 h-16 bg-gradient-to-r ${mode.color} rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-200`}
                    >
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>

                    {/* Content */}
                    <div className="text-center space-y-3">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {mode.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                        {mode.description}
                      </p>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {mode.players}
                      </div>
                    </div>

                    {/* Hover Effect */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mt-8">
            <Button variant="outline" onClick={handleClose} className="px-8">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
