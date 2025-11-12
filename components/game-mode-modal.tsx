"use client";

import { Mic, Trophy, Users, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { TournamentCreateModal } from "@/components/tournament-create-modal";

interface GameModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMultiplayerSelect?: () => void;
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
    description: "Challenge friends to battle on this song",
    icon: Users,
    color: "from-purple-500 to-pink-500",
    players: "Challenge a friend",
  },
  {
    id: "tournament",
    title: "Tournament",
    description: "Create a tournament where each player picks their own song",
    icon: Trophy,
    color: "from-yellow-500 to-orange-500",
    players: "2-32 players",
  },
];

// Component to filter out redirectUrl prop from SignInButton
const SignInButtonChild = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { redirectUrl?: string }
>((props, ref) => {
  // Filter out redirectUrl so it doesn't get passed to the DOM button element
  const { redirectUrl, ...restProps } = props;
  // redirectUrl is intentionally ignored - it's handled by Clerk internally
  void redirectUrl; // Explicitly mark as intentionally unused
  return (
    <button
      ref={ref}
      type="button"
      className="inline-flex items-center justify-center rounded-md bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
      {...restProps}
    >
      Sign In / Sign Up
    </button>
  );
});
SignInButtonChild.displayName = "SignInButtonChild";

export function GameModeModal({
  isOpen,
  onClose,
  onMultiplayerSelect,
  songId,
  songTitle,
  songArtist,
}: GameModeModalProps) {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [pendingMode, setPendingMode] = useState<string | null>(null);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const previousSignedInState = useRef<boolean | null>(null);

  // Watch for authentication state changes and redirect after sign-in
  useEffect(() => {
    if (isLoaded && previousSignedInState.current === false && isSignedIn) {
      // User just signed in, redirect to gameplay if there's a pending mode
      if (pendingMode) {
        const gameplayUrl = `/gameplay?songId=${songId}&mode=${pendingMode}`;
        // Close the modals
        setShowAuthPrompt(false);
        onClose();
        // Navigate to gameplay
        router.push(gameplayUrl);
        // Clear pending mode
        setPendingMode(null);
      }
    }
    previousSignedInState.current = isSignedIn ?? null;
  }, [isSignedIn, isLoaded, pendingMode, songId, router, onClose]);

  const handleModeSelect = (modeId: string) => {
    // Check if user is authenticated
    if (!isLoaded) {
      return; // Still loading auth state
    }

    if (!isSignedIn) {
      // Store the selected mode and show authentication prompt
      setPendingMode(modeId);
      setShowAuthPrompt(true);
      return;
    }

    if (modeId === "multiplayer" && onMultiplayerSelect) {
      // For multiplayer, open friend selection modal instead
      onMultiplayerSelect();
    } else if (modeId === "tournament") {
      // For tournament, open tournament creation modal
      setShowTournamentModal(true);
    } else {
      // For single player, navigate to gameplay
      router.push(`/gameplay?songId=${songId}&mode=${modeId}`);
    }
  };

  const handleClose = useCallback(() => {
    setShowAuthPrompt(false);
    setPendingMode(null);
    setShowTournamentModal(false);
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
      {/* Authentication Prompt with Clerk Modal */}
      {showAuthPrompt && (
        <div
          className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Sign In Required
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please sign in or create an account to start playing karaoke
              battles!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <SignInButton
                mode="modal"
                fallbackRedirectUrl={`/gameplay?songId=${songId}&mode=${pendingMode}`}
              >
                <SignInButtonChild />
              </SignInButton>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAuthPrompt(false);
                  setPendingMode(null);
                }}
                className="px-6 py-2"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Game Mode Selection Modal */}
      {!showAuthPrompt && (
        <div 
          className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          data-tour="mode-selection"
        >
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
      )}

      {/* Tournament Creation Modal */}
      <TournamentCreateModal
        isOpen={showTournamentModal}
        onClose={() => setShowTournamentModal(false)}
      />
    </div>
  );
}
