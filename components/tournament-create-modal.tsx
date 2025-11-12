"use client";

import { Check, Copy, Trophy, Users, X } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";

interface TournamentCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TournamentSession {
  id: string;
  sessionCode: string;
  name: string | null;
  joinUrl: string;
  status: string;
  maxPlayers: number;
  currentPlayers: number;
}

export function TournamentCreateModal({
  isOpen,
  onClose,
}: TournamentCreateModalProps) {
  const router = useRouter();
  const [tournamentName, setTournamentName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isCreating, setIsCreating] = useState(false);
  const [createdSession, setCreatedSession] =
    useState<TournamentSession | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);

  const handleClose = useCallback(() => {
    setTournamentName("");
    setMaxPlayers(8);
    setCreatedSession(null);
    setLinkCopied(false);
    setRulesAccepted(false);
    onClose();
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/tournament/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tournamentName.trim() || null,
          maxPlayers,
          settings: {
            rounds: 1,
            turnTimeLimit: 300, // 5 minutes for gameplay
            songSelectionTimeLimit: 60, // 60 seconds to select a song
          },
        }),
      });

      const data = await response.json();

      if (data.success && data.session) {
        setCreatedSession(data.session);
        toast.success(
          "Tournament created!",
          "Share the link with your friends to join."
        );
      } else {
        toast.error(data.message || "Failed to create tournament");
      }
    } catch (error) {
      console.error("Error creating tournament:", error);
      toast.error("Failed to create tournament", "Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdSession) return;

    try {
      await navigator.clipboard.writeText(createdSession.joinUrl);
      setLinkCopied(true);
      toast.success("Link copied!", "Share it with your friends.");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast.error("Failed to copy link", "Please try again.");
    }
  };

  const handleGoToLobby = () => {
    if (createdSession) {
      router.push(`/tournament/lobby/${createdSession.sessionCode}`);
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
      <div
        className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create Tournament
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Set up a tournament session for your friends
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

        {/* Content */}
        <div className="p-6">
          {!createdSession ? (
            /* Creation Form */
            <div className="space-y-6">
              {/* Info Box */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-purple-800 dark:text-purple-200">
                    <p className="font-semibold mb-1">Turn-Based Tournament</p>
                    <p className="mb-2">
                      Each player picks their own song when it&apos;s their
                      turn. Players take turns selecting and performing songs,
                      and scores are tracked throughout the tournament.
                    </p>
                    <p className="text-xs italic mb-2">
                      Note: You&apos;ll select your song when the tournament
                      starts and it&apos;s your turn (you go first as the host).
                    </p>
                    <p className="text-xs">
                      ⏱️ You&apos;ll have 60 seconds to select your song when
                      it&apos;s your turn.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tournament Name */}
              <div>
                <label
                  htmlFor="tournament-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Tournament Name (Optional)
                </label>
                <Input
                  id="tournament-name"
                  type="text"
                  placeholder="Friday Night Karaoke"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  className="w-full"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Give your tournament a memorable name
                </p>
              </div>

              {/* Max Players */}
              <div>
                <label
                  htmlFor="max-players"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Maximum Players
                </label>
                <div className="flex items-center gap-4">
                  <Input
                    id="max-players"
                    type="number"
                    min={2}
                    max={32}
                    value={maxPlayers}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 8;
                      setMaxPlayers(Math.min(Math.max(value, 2), 32));
                    }}
                    className="w-24"
                  />
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">2-32 players</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  How many players can join this tournament
                </p>
              </div>

              {/* Rules Acceptance Checkbox */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <input
                  type="checkbox"
                  id="rules-acceptance"
                  checked={rulesAccepted}
                  onChange={(e) => setRulesAccepted(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-2 mt-0.5 flex-shrink-0 cursor-pointer"
                />
                <label
                  htmlFor="rules-acceptance"
                  className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex-1"
                >
                  <span className="font-medium">
                    I understand the tournament rules:
                  </span>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    <li>
                      Each player picks their own song when it&apos;s their turn
                    </li>
                    <li>Players have 60 seconds to select their song</li>
                    <li>
                      I&apos;ll select my song when the tournament starts (I go
                      first as host)
                    </li>
                    <li>Scores are tracked throughout the tournament</li>
                  </ul>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isCreating || !rulesAccepted}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? "Creating..." : "Create Tournament"}
                </Button>
              </div>
            </div>
          ) : (
            /* Success View */
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Tournament Created!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Share the link below with your friends to join
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-semibold mb-1">How it works:</p>
                  <p className="mb-2">
                    Each player will pick their own song when it&apos;s their
                    turn. The tournament is turn-based, so players take turns
                    selecting and performing songs.
                  </p>
                  <p className="text-xs italic">
                    As the host, you&apos;ll go first and select your song when
                    the tournament starts.
                  </p>
                </div>
              </div>

              {/* Session Code */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Session Code
                  </p>
                  <p className="text-4xl font-bold text-purple-600 dark:text-purple-400 font-mono tracking-wider">
                    {createdSession.sessionCode}
                  </p>
                </div>
              </div>

              {/* Shareable Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Shareable Link
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={createdSession.joinUrl}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={handleCopyLink}
                    className="px-4"
                  >
                    {linkCopied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Tournament Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Max Players
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {createdSession.maxPlayers}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Current Players
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {createdSession.currentPlayers}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button
                  onClick={handleGoToLobby}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  Go to Lobby
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
