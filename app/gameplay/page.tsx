"use client";

import {
  ArrowLeft,
  HelpCircle,
  Maximize,
  Minimize,
  Music,
  Pause,
  Play,
  RotateCcw,
  Square,
  Trophy,
  XCircle,
} from "lucide-react";
import {
  FullScreenEventDisplay,
  GameplayEventDisplay,
} from "@/components/gameplay-event-display";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ChallengeContext } from "@/components/challenge-context";
import { ChallengeResults } from "@/components/challenge-results";
import Link from "next/link";
import { LyricsDisplayWithFrequency } from "@/components/lyrics-display-with-frequency";
import { ProtectedRoute } from "@/components/protected-route";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfile } from "@/components/user-profile";
import { debugLog } from "@/lib/debug";
import { formatTime } from "@/lib/utils";
import { getLevelTitle } from "@/lib/experience";
import { getSongById } from "@/lib/songs-data";
import { toast } from "@/lib/toast";
import { useGameplayEvents } from "@/hooks/use-gameplay-events";
import { useSearchParams } from "next/navigation";
import { useSimpleKaraoke } from "@/hooks/use-simple-karaoke";
import { useUser } from "@clerk/nextjs";

function GameplayContent() {
  const searchParams = useSearchParams();
  const songId = searchParams.get("songId") || "bohemian-rhapsody";
  const challengeId = searchParams.get("challengeId");

  const { user } = useUser();
  const currentSong = getSongById(songId);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Challenge state
  interface ChallengeParticipant {
    id: string;
    userId: string;
    user: {
      id: string;
      username: string;
      firstName: string | null;
      lastName: string | null;
      avatar: string | null;
      level: number;
    };
    status: string;
    score: number | null;
    acceptedAt: string | null;
    declinedAt: string | null;
    completedAt: string | null;
  }

  interface Challenge {
    id: string;
    status: string;
    expiresAt: string | null;
    completedAt: string | null;
    winner: {
      id: string;
      username: string;
      firstName: string | null;
      lastName: string | null;
      avatar: string | null;
    } | null;
    song: {
      id: string;
      customId: string;
      title: string;
      artist: string;
      thumbnail: string | null;
    };
    participants: ChallengeParticipant[];
  }

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Score decay system
  const [lastVoiceActivity, setLastVoiceActivity] = useState<number>(
    Date.now()
  );
  const [isDecaying, setIsDecaying] = useState(false);
  const [decayAmount, setDecayAmount] = useState(0); // Track total decay applied
  const decayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Gameplay events system
  const { events, stats, processScoreUpdate, resetStats } = useGameplayEvents({
    onEvent: (event) => {
      debugLog("🎉 Gameplay event:", event);
    },
    onStatsUpdate: (stats) => {
      debugLog("📊 Stats updated:", stats);
    },
  });

  // Real leaderboard data
  const [leaderboard, setLeaderboard] = useState<
    Array<{
      id: string; // Unique session ID
      rank: number;
      userId: string;
      player: string;
      score: number;
      level: number;
      avatar: string | null;
    }>
  >([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [userBestScore, setUserBestScore] = useState<{
    score: number;
    rank: number | null;
  } | null>(null);

  // Check if we're running locally for debug info
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.protocol === "http:");
  const [gameEndReason, setGameEndReason] = useState<"completed" | "quit">(
    "completed"
  );
  const [finalScore, setFinalScore] = useState({
    totalScore: 0,
    accuracy: 0,
    timing: 0,
    scoringEvents: 0,
  });

  const {
    isPlaying,
    isRecording,
    isPaused,
    currentTime,
    score,
    accuracy,
    timing,
    transcript,
    volumeLevel,
    microphoneReady,
    error,
    isVoiceActive,
    currentLyric,
    upcomingLyrics,
    lyricsLoaded,
    scoringEvents,
    frequencyData,
    loadSong,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    getAudioPlayer,
    clearError,
  } = useSimpleKaraoke({
    onScoreUpdate: (newScore: number, newAccuracy: number) => {
      debugLog("🎯 Score update received:", {
        newScore,
        newAccuracy,
        currentHookScore: score,
        currentHookAccuracy: accuracy,
        currentHookTiming: timing,
        gameplayBonusPoints: stats.totalBonusPoints,
      });

      // Process gameplay events based on score update
      // We'll use the current timing value from the hook
      processScoreUpdate(newAccuracy, timing, newScore);
    },
    onGameEnd: async (finalScore, totalAccuracy, totalTiming) => {
      debugLog("🎮 Game ended naturally - callback received:", {
        finalScore,
        totalAccuracy,
        totalTiming,
      });

      // Use callback parameters - these come from the hook's current state via ref
      // This ensures we get the most up-to-date values, just like manual stop
      const currentScore = finalScore;
      const currentAccuracy = totalAccuracy;
      const currentTiming = totalTiming;

      debugLog("🔍 DETAILED SCORE DEBUG - Natural Completion:", {
        // Callback values (these are the current values from hook's stateRef)
        callbackScore: finalScore,
        callbackAccuracy: totalAccuracy,
        callbackTiming: totalTiming,

        // Hook state values (might be stale, but shown for comparison)
        hookScore: score,
        hookAccuracy: accuracy,
        hookTiming: timing,
        hookScoringEvents: scoringEvents,

        // Gameplay events
        gameplayBonusPoints: stats.totalBonusPoints,
        gameplayStats: stats,

        // Decay
        decayAmount: decayAmount,
        isDecaying: isDecaying,

        // Song info
        songId: currentSong?.id,
        songTitle: currentSong?.title,
      });

      // Apply score decay if user stopped singing
      const decayedAccuracy = Math.max(0, currentAccuracy - decayAmount);
      const decayedTiming = Math.max(0, currentTiming - decayAmount);

      debugLog("Score decay applied:", {
        originalAccuracy: currentAccuracy,
        originalTiming: currentTiming,
        decayAmount,
        decayedAccuracy,
        decayedTiming,
      });

      // Calculate total score including gameplay event bonuses
      const totalScoreWithBonuses = currentScore + stats.totalBonusPoints;
      debugLog("Natural completion score calculation:", {
        hookScore: currentScore,
        hookAccuracy: currentAccuracy,
        hookTiming: currentTiming,
        callbackScore: finalScore,
        callbackAccuracy: totalAccuracy,
        callbackTiming: totalTiming,
        bonusPoints: stats.totalBonusPoints,
        totalScore: totalScoreWithBonuses,
      });

      // Set reason as completed
      setGameEndReason("completed");

      // Capture final scores and show results when song completes naturally
      setFinalScore({
        totalScore: totalScoreWithBonuses,
        accuracy: decayedAccuracy,
        timing: decayedTiming,
        scoringEvents: scoringEvents,
      });

      // Submit to challenge if in challenge mode
      if (challengeId && challenge) {
        await submitChallengeScore(totalScoreWithBonuses);
      }

      // Update user experience - session is confirmed for natural completion
      try {
        const response = await fetch("/api/user/experience", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            totalScore: totalScoreWithBonuses,
            accuracy: decayedAccuracy,
            timing: decayedTiming,
            songDifficulty: currentSong?.difficulty || "MEDIUM",
            songId: currentSong?.id,
            gameEndReason: "completed",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            debugLog("Experience updated:", data);
            if (data.leveledUp) {
              debugLog("🎉 Level up! New level:", data.newLevel);
            }

            // Refresh leaderboard after completing song
            fetchLeaderboard();
          }
        }
      } catch (error) {
        console.error("Error updating experience:", error);
      }

      // Show results screen - wait a bit to ensure state is updated
      setTimeout(() => {
        setShowResults(true);
      }, 100);
    },
  });

  // Clear any error state when component mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      debugLog("🎵 Component mounted, clearing error state");
      clearError();
    }
  }, [clearError]);

  // Score decay system - gradually reduce timing and accuracy when user stops singing
  useEffect(() => {
    if (!isPlaying || isPaused) return;

    const checkVoiceActivity = () => {
      const now = Date.now();
      const timeSinceLastVoice = now - lastVoiceActivity;

      // If user has been silent for more than 2 seconds, start decay
      if (timeSinceLastVoice > 2000 && !isDecaying) {
        setIsDecaying(true);
        debugLog("🔇 User stopped singing, starting score decay");

        // Start decay interval
        decayIntervalRef.current = setInterval(() => {
          // Gradually reduce timing and accuracy
          // This simulates the user falling behind as the song continues
          const decayRate = 0.5; // Reduce by 0.5% per second

          // Track total decay applied
          setDecayAmount((prev) => {
            const newDecay = prev + decayRate;
            debugLog("📉 Score decay: total decay now", newDecay);
            return newDecay;
          });
        }, 1000);
      }
      // If user starts singing again, stop decay
      else if (timeSinceLastVoice <= 2000 && isDecaying) {
        setIsDecaying(false);
        if (decayIntervalRef.current) {
          clearInterval(decayIntervalRef.current);
          decayIntervalRef.current = null;
        }
        debugLog("🎤 User started singing again, stopping score decay");
      }
    };

    // Check voice activity every 500ms
    const voiceCheckInterval = setInterval(checkVoiceActivity, 500);

    return () => {
      clearInterval(voiceCheckInterval);
      if (decayIntervalRef.current) {
        clearInterval(decayIntervalRef.current);
        decayIntervalRef.current = null;
      }
    };
  }, [isPlaying, isPaused, lastVoiceActivity, isDecaying]);

  // Track voice activity
  useEffect(() => {
    if (isVoiceActive && volumeLevel > 0.01) {
      setLastVoiceActivity(Date.now());
    }
  }, [isVoiceActive, volumeLevel]);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    if (!currentSong?.id) return;

    try {
      setLeaderboardLoading(true);
      const response = await fetch(`/api/songs/${currentSong.id}/leaderboard`);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLeaderboard(data.leaderboard || []);
          setUserBestScore(data.userBestScore || null);
          debugLog("🏆 Leaderboard fetched:", {
            entries: data.leaderboard?.length || 0,
            userBestScore: data.userBestScore,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [currentSong?.id]);

  // Get current user's database ID
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setCurrentUserId(data.user.id);
          }
        }
      } catch (error) {
        console.error("Error fetching user ID:", error);
      }
    };

    fetchCurrentUserId();
  }, [user?.id]);

  // Fetch challenge data when challengeId is present
  useEffect(() => {
    const fetchChallenge = async () => {
      if (!challengeId || !currentUserId) return;

      try {
        const response = await fetch(`/api/challenges/${challengeId}`);

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setChallenge(data.challenge as Challenge);

            // Validate user is participant
            const isParticipant = data.challenge.participants.some(
              (p: ChallengeParticipant) => p.userId === currentUserId
            );

            if (!isParticipant) {
              toast.error(
                "Challenge Error",
                "You are not a participant in this challenge"
              );
              return;
            }

            // Validate song matches
            if (data.challenge.song.customId !== songId) {
              toast.error(
                "Song Mismatch",
                `This challenge is for "${data.challenge.song.title}", not the current song.`
              );
              return;
            }

            // Validate challenge status
            const participant = data.challenge.participants.find(
              (p: ChallengeParticipant) => p.userId === currentUserId
            );

            if (participant?.status !== "ACCEPTED") {
              toast.error(
                "Challenge Not Accepted",
                "You must accept the challenge before you can play."
              );
              return;
            }

            debugLog("✅ Challenge loaded successfully:", data.challenge);
          }
        } else {
          const errorData = await response.json();
          toast.error(
            "Challenge Error",
            errorData.message || "Failed to load challenge"
          );
        }
      } catch (error) {
        console.error("Error fetching challenge:", error);
        toast.error("Challenge Error", "Failed to load challenge data");
      }
    };

    fetchChallenge();
  }, [challengeId, currentUserId, songId]);

  // Load song when component mounts
  useEffect(() => {
    if (typeof window === "undefined") return;

    debugLog("🎵 useEffect triggered, currentSong:", currentSong);
    debugLog("🎵 songId from URL:", songId);

    if (currentSong) {
      debugLog("🎵 Loading song:", currentSong);

      // Fetch leaderboard data
      fetchLeaderboard();

      setTimeout(async () => {
        try {
          // Additional validation before loading
          if (!currentSong.audioFile) {
            console.error("❌ Song missing audioFile property:", currentSong);
            return;
          }
          const success = await loadSong(currentSong);
          if (success) {
            debugLog("✅ Song loaded successfully");
            // Check if audio is ready after loading
            const audioPlayer = getAudioPlayer();
            if (audioPlayer) {
              const audioState = audioPlayer.getAudioState();
              debugLog("Audio state after loading:", audioState);

              // If not ready, wait a bit more and check again
              if (!audioPlayer.isReadyToPlay()) {
                debugLog("Audio not ready immediately, waiting...");
                setTimeout(() => {
                  const retryState = audioPlayer.getAudioState();
                  debugLog("Audio state after retry:", retryState);
                }, 1000);
              }
            }
          } else {
            console.error("❌ Failed to load song");
          }
        } catch (error) {
          console.error("❌ Error loading song:", error);
        } finally {
          setIsInitializing(false);
        }
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong, fetchLeaderboard]);

  const togglePlay = async () => {
    if (isPlaying) {
      // If currently playing, pause
      pauseGame();
    } else if (isPaused) {
      // If paused, resume
      try {
        await resumeGame();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        toast.error("Failed to resume gameplay", errorMsg);
      }
    } else {
      // If stopped, start
      if (!microphoneReady) {
        toast.warning(
          "Microphone not ready",
          "Please wait a moment and try again."
        );
        return;
      }

      const audioPlayer = getAudioPlayer();
      if (!audioPlayer) {
        toast.error("Audio player not initialized", "Please refresh the page.");
        return;
      }

      if (!audioPlayer.isReadyToPlay()) {
        const audioState = audioPlayer.getAudioState();
        console.log("Audio not ready:", audioState);
        toast.warning(
          "Audio not ready",
          `Ready state: ${audioState.readyState}, Duration: ${audioState.duration}. Please wait a moment and try again.`
        );
        return;
      }

      try {
        await startGame();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        toast.error("Failed to start gameplay", errorMsg);
      }
    }
  };

  const handleStopGame = () => {
    setShowStopModal(true);
  };

  const confirmStopGame = async () => {
    // Stop the game and calculate final score
    const audioPlayer = getAudioPlayer();
    if (audioPlayer) {
      audioPlayer.pause();
    }

    // Set reason as quit
    setGameEndReason("quit");

    debugLog("🔍 DETAILED SCORE DEBUG - Manual Stop:", {
      // Hook values
      hookScore: score,
      hookAccuracy: accuracy,
      hookTiming: timing,
      hookScoringEvents: scoringEvents,

      // Gameplay events
      gameplayBonusPoints: stats.totalBonusPoints,
      gameplayStats: stats,

      // Decay
      decayAmount: decayAmount,
      isDecaying: isDecaying,

      // Song info
      songId: currentSong?.id,
      songTitle: currentSong?.title,
    });

    // Apply score decay if user stopped singing
    const decayedAccuracy = Math.max(0, accuracy - decayAmount);
    const decayedTiming = Math.max(0, timing - decayAmount);

    debugLog("Manual stop score decay applied:", {
      originalAccuracy: accuracy,
      originalTiming: timing,
      decayAmount,
      decayedAccuracy,
      decayedTiming,
    });

    // Calculate total score including gameplay event bonuses
    const totalScoreWithBonuses = score + stats.totalBonusPoints;
    debugLog("Manual stop score calculation:", {
      baseScore: score,
      bonusPoints: stats.totalBonusPoints,
      totalScore: totalScoreWithBonuses,
    });

    // Capture final scores
    setFinalScore({
      totalScore: totalScoreWithBonuses,
      accuracy: decayedAccuracy,
      timing: decayedTiming,
      scoringEvents: scoringEvents,
    });

    // Submit to challenge if in challenge mode
    if (challengeId && challenge) {
      await submitChallengeScore(totalScoreWithBonuses);
    }

    // Update user experience - user has explicitly confirmed they want to end the session
    try {
      const response = await fetch("/api/user/experience", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          totalScore: totalScoreWithBonuses,
          accuracy: decayedAccuracy,
          timing: decayedTiming,
          songDifficulty: currentSong?.difficulty || "MEDIUM",
          songId: currentSong?.id,
          gameEndReason: "quit",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log("Experience updated:", data);
          if (data.leveledUp) {
            console.log("🎉 Level up! New level:", data.newLevel);
          }

          // Refresh leaderboard after completing song
          fetchLeaderboard();
        }
      }
    } catch (error) {
      console.error("Error updating experience:", error);
    }

    // Show results screen
    setShowStopModal(false);
    setShowResults(true);
  };

  const cancelStopGame = () => {
    setShowStopModal(false);
  };

  // Submit score to challenge
  const submitChallengeScore = useCallback(
    async (totalScore: number) => {
      if (!challengeId || !challenge) return;

      try {
        debugLog("🏆 Submitting challenge score:", {
          challengeId,
          totalScore,
        });

        const response = await fetch(`/api/challenges/${challengeId}/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            totalScore,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            debugLog("✅ Challenge score submitted successfully:", data);
            toast.success(
              "Score Submitted",
              "Your score has been submitted to the challenge!"
            );

            // Refresh challenge data to get updated scores
            const challengeResponse = await fetch(
              `/api/challenges/${challengeId}`
            );
            if (challengeResponse.ok) {
              const challengeData = await challengeResponse.json();
              if (challengeData.success) {
                setChallenge(challengeData.challenge);
              }
            }

            return true;
          }
        } else {
          const errorData = await response.json();
          debugLog("❌ Challenge score submission failed:", errorData);
          toast.error(
            "Submission Failed",
            errorData.message || "Failed to submit score to challenge"
          );
          return false;
        }
      } catch (error) {
        console.error("Error submitting challenge score:", error);
        toast.error("Submission Error", "Failed to submit score to challenge");
        return false;
      }
    },
    [challengeId, challenge]
  );

  const playAgain = async () => {
    // Show loading state
    setIsRestarting(true);

    // Hide results screen
    setShowResults(false);

    // Reset game state
    resetGame();

    // Reset gameplay events
    resetStats();

    // Reset score decay system
    setDecayAmount(0);
    setIsDecaying(false);
    setLastVoiceActivity(Date.now());

    // Reset local state
    setGameEndReason("completed");
    setFinalScore({
      totalScore: 0,
      accuracy: 0,
      timing: 0,
      scoringEvents: 0,
    });

    // Add a small delay to ensure microphone reset and reinitialization completes
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Reload the song
    if (currentSong) {
      try {
        await loadSong(currentSong);
      } catch (error) {
        console.error("Failed to reload song:", error);
      }
    }

    // Hide loading state
    setIsRestarting(false);
  };

  const chooseDifferentSong = () => {
    // Navigate to songs page
    window.location.href = "/songs";
  };

  // Full-screen functionality
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Handle click in full-screen mode
  const handleFullScreenClick = () => {
    // Only handle play/pause functionality in full-screen mode
    if (isPlaying) {
      pauseGame();
    } else if (isPaused) {
      resumeGame();
    } else {
      // If stopped, start
      if (!microphoneReady) {
        toast.warning(
          "Microphone not ready",
          "Please wait a moment and try again."
        );
        return;
      }

      const audioPlayer = getAudioPlayer();
      if (!audioPlayer) {
        toast.error("Audio player not initialized", "Please refresh the page.");
        return;
      }

      if (!audioPlayer.isReadyToPlay()) {
        const audioState = audioPlayer.getAudioState();
        console.log("Audio not ready:", audioState);
        toast.warning(
          "Audio not ready",
          `Ready state: ${audioState.readyState}, Duration: ${audioState.duration}. Please wait a moment and try again.`
        );
        return;
      }

      try {
        startGame();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        toast.error("Failed to start gameplay", errorMsg);
      }
    }
  };

  // Handle escape key to exit full-screen
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
      if (event.key === "Escape" && showHelpModal) {
        setShowHelpModal(false);
      }
      if (event.key === "Escape" && showScoringModal) {
        setShowScoringModal(false);
      }
    };

    if (isFullScreen || showHelpModal || showScoringModal) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isFullScreen, showHelpModal, showScoringModal]);

  const audioPlayer = getAudioPlayer();
  const progress =
    audioPlayer && audioPlayer.getState().duration > 0
      ? (currentTime / (audioPlayer.getState().duration * 1000)) * 100
      : 0;

  if (!currentSong) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Song Not Found</h1>
            <p className="mb-4">
              The song with ID &quot;{songId}&quot; was not found.
            </p>
            <Link
              href="/songs"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              ← Back to Songs
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Show results screen if game was stopped
  if (showResults) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
          {/* Header */}
          <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="text-gray-900 dark:text-white">
                <h1 className="text-lg font-semibold">Final Results</h1>
                <p className="text-sm text-gray-600 dark:text-white/70">
                  {currentSong.title} by {currentSong.artist}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <UserProfile />
              <ThemeToggle />
            </div>
          </header>

          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Challenge Results - Show if in challenge mode */}
              {challenge && challengeId && currentUserId ? (
                <ChallengeResults
                  challenge={challenge}
                  currentUserId={currentUserId}
                  currentUserScore={finalScore.totalScore}
                  onViewDetails={() => {
                    window.location.href = `/battles`;
                  }}
                />
              ) : (
                /* Regular Results Card */
                <div className="bg-white/80 dark:bg-white/10 rounded-xl p-8 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-center">
                  <div className="mb-8">
                    <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {gameEndReason === "completed"
                        ? finalScore.totalScore >= 80
                          ? "Song Complete - Excellent Performance!"
                          : finalScore.totalScore >= 60
                          ? "Song Complete - Great Job!"
                          : "Song Complete - Keep Practicing!"
                        : finalScore.totalScore >= 80
                        ? "Excellent Performance!"
                        : finalScore.totalScore >= 60
                        ? "Great Job!"
                        : "Keep Practicing!"}
                    </h2>
                    <p className="text-gray-600 dark:text-white/70">
                      {gameEndReason === "completed"
                        ? "Congratulations! You completed the entire song!"
                        : "Here's how you did on this song"}
                    </p>
                  </div>

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {finalScore.totalScore}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-white/70">
                        Total Score
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                        {finalScore.accuracy}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-white/70">
                        Accuracy
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                        {finalScore.timing}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-white/70">
                        Timing
                      </div>
                    </div>
                  </div>

                  {/* Performance Feedback */}
                  <div className="mb-8">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Performance Summary
                      </h3>
                      <p className="text-gray-600 dark:text-white/70">
                        {finalScore.scoringEvents > 0
                          ? `You scored points on ${finalScore.scoringEvents} events during your performance.`
                          : "Keep practicing to improve your karaoke skills!"}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      onClick={playAgain}
                      disabled={isRestarting}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 disabled:opacity-50"
                    >
                      <RotateCcw
                        className={`h-4 w-4 mr-2 ${
                          isRestarting ? "animate-spin" : ""
                        }`}
                      />
                      {isRestarting ? "Restarting..." : "Play Again"}
                    </Button>
                    <Button
                      onClick={chooseDifferentSong}
                      variant="outline"
                      className="border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 px-6 py-3"
                    >
                      <Music className="h-4 w-4 mr-2" />
                      Choose Different Song
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Full-screen layout
  if (isFullScreen) {
    return (
      <ProtectedRoute>
        <div
          className="fixed inset-0 bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900 text-white z-50 flex flex-col"
          onClick={handleFullScreenClick}
        >
          {/* Full-screen header */}
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <div className="flex items-center space-x-4">
              <div className="text-white">
                <h1 className="text-xl font-semibold">{currentSong.title}</h1>
                <p className="text-sm text-white/70">{currentSong.artist}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center text-white">
                <div className="text-3xl font-bold">{score}</div>
                <div className="text-sm text-white/70">Score</div>
              </div>
              {stats.currentStreak > 0 && (
                <div className="text-center text-orange-400">
                  <div className="text-2xl font-bold">
                    🔥 {stats.currentStreak}
                  </div>
                  <div className="text-xs text-white/70">Streak</div>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullScreen(false);
                }}
                className="text-white border-white/30 hover:bg-white/10"
                title="Exit Full Screen"
              >
                <Minimize className="h-4 w-4 mr-2" />
                Exit Full Screen
              </Button>
            </div>
          </div>

          {/* Full-screen gameplay area */}
          <div className="flex-1 flex flex-col p-6">
            {/* Progress Bar */}
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/20 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-medium">
                  {formatTime(currentTime / 1000)}
                </span>
                <span className="text-white/70">
                  {audioPlayer
                    ? formatTime(audioPlayer.getState().duration)
                    : "0:00"}
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-pink-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Status Display */}
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/20 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-white">
                    {accuracy}%
                  </div>
                  <div className="text-sm text-white/70">Accuracy</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">{timing}%</div>
                  <div className="text-sm text-white/70">Timing</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">
                    {isRecording ? "🔴" : "⏹️"}
                  </div>
                  <div className="text-sm text-white/70">Recording</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">
                    {isPlaying ? "▶️" : isPaused ? "⏸️" : "⏹️"}
                  </div>
                  <div className="text-sm text-white/70">Status</div>
                </div>
                {stats.totalBonusPoints > 0 && (
                  <div>
                    <div className="text-3xl font-bold text-yellow-400">
                      +{stats.totalBonusPoints}
                    </div>
                    <div className="text-sm text-white/70">Bonus</div>
                  </div>
                )}
              </div>
            </div>

            {/* Lyrics Display */}
            <div className="flex-1 bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900 rounded-xl backdrop-blur-sm border border-purple-200">
              {isInitializing ? (
                <div className="h-full flex flex-col justify-center items-center text-center">
                  <div className="text-white text-2xl">Initializing...</div>
                </div>
              ) : error ? (
                <div className="h-full flex flex-col justify-center items-center text-center">
                  <div className="text-red-400">
                    <div className="text-2xl font-bold mb-2">Error</div>
                    <div className="text-sm">{error}</div>
                  </div>
                </div>
              ) : (
                <div className="h-full relative">
                  <LyricsDisplayWithFrequency
                    currentLyric={currentLyric}
                    upcomingLyrics={upcomingLyrics}
                    frequencyData={frequencyData || new Uint8Array(0)}
                    isVoiceActive={isVoiceActive}
                    isRecording={isRecording}
                    className="h-full"
                  />

                  {/* Voice Transcription */}
                  {transcript && (
                    <div className="absolute bottom-4 left-4 right-4 bg-black/20 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                      <div className="text-sm text-white/70 mb-1">
                        Your voice:
                      </div>
                      <div className="text-white">
                        &ldquo;{transcript}&rdquo;
                      </div>
                    </div>
                  )}

                  {/* Click instruction */}
                  <div className="absolute top-4 left-4 bg-black/20 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                    <div className="text-sm text-white/70">
                      Click anywhere to{" "}
                      {isPlaying ? "pause" : isPaused ? "resume" : "start"}
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                      Exit full-screen to stop
                    </div>
                  </div>

                  {/* Full-screen exit button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFullScreen(false);
                    }}
                    className="absolute bottom-4 right-4 bg-black/20 backdrop-blur-sm border-white/30 hover:bg-white/10 text-white hover:text-white z-10"
                    title="Exit Full Screen"
                  >
                    <Minimize className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Full-screen Gameplay Events Display */}
          <FullScreenEventDisplay events={events} />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Link href="/songs">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
                  title="Back to Songs"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/songs">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
                  title="Back to Songs"
                >
                  <Music className="h-5 w-5" />
                </Button>
              </Link>
            </div>
            <div className="text-gray-900 dark:text-white">
              <h1 className="text-lg font-semibold">{currentSong.title}</h1>
              <p className="text-sm text-gray-600 dark:text-white/70">
                {currentSong.artist}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHelpModal(true)}
              className="text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              title="How Scoring Works"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Rules
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScoringModal(true)}
              className="text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              title="Scoring & Levels"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Scoring
            </Button>
            <div className="text-center text-gray-900 dark:text-white">
              <div className="text-2xl font-bold">{score}</div>
              <div className="text-sm text-gray-600 dark:text-white/70">
                Score
              </div>
            </div>
            {stats.currentStreak > 0 && (
              <div className="text-center text-orange-600 dark:text-orange-400">
                <div className="text-xl font-bold">
                  🔥 {stats.currentStreak}
                </div>
                <div className="text-xs">Streak</div>
              </div>
            )}
            <UserProfile />
            <ThemeToggle />
          </div>
        </header>

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {/* Main Gameplay Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Progress Bar */}
              <div className="bg-white/80 dark:bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-900 dark:text-white font-medium">
                    {formatTime(currentTime / 1000)}
                  </span>
                  <span className="text-gray-600 dark:text-white/70">
                    {audioPlayer
                      ? formatTime(audioPlayer.getState().duration)
                      : "0:00"}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-white/20 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Status Display */}
              <div className="bg-white/80 dark:bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {accuracy}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-white/70">
                      Accuracy
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {timing}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-white/70">
                      Timing
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {isRecording ? "🔴" : "⏹️"}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-white/70">
                      Recording
                    </div>
                  </div>
                  {stats.totalBonusPoints > 0 && (
                    <div>
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        +{stats.totalBonusPoints}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-white/70">
                        Bonus
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lyrics Display with Waveform Background */}
              {isInitializing ? (
                <div className="bg-white/80 dark:bg-white/10 rounded-xl p-8 text-center min-h-[400px] flex flex-col justify-center backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                  <div className="text-gray-900 dark:text-white text-xl">
                    Initializing...
                  </div>
                </div>
              ) : error ? (
                <div className="bg-white/80 dark:bg-white/10 rounded-xl p-8 text-center min-h-[400px] flex flex-col justify-center backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                  <div className="text-red-600 dark:text-red-400">
                    <div className="text-xl font-bold mb-2">Error</div>
                    <div className="text-sm">{error}</div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900 rounded-xl min-h-[400px] backdrop-blur-sm border border-purple-200 dark:border-purple-700">
                  <LyricsDisplayWithFrequency
                    currentLyric={currentLyric}
                    upcomingLyrics={upcomingLyrics}
                    frequencyData={frequencyData || new Uint8Array(0)}
                    isVoiceActive={isVoiceActive}
                    isRecording={isRecording}
                    className="min-h-[400px]"
                  />

                  {/* Voice Transcription */}
                  {transcript && (
                    <div className="absolute bottom-4 left-4 right-4 bg-black/20 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                      <div className="text-sm text-white/70 mb-1">
                        Your voice:
                      </div>
                      <div className="text-white">
                        &ldquo;{transcript}&rdquo;
                      </div>
                    </div>
                  )}

                  {/* Full-screen button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFullScreen();
                    }}
                    className="absolute bottom-4 right-4 bg-black/20 backdrop-blur-sm border-white/30 hover:bg-white/10 text-white hover:text-white z-10"
                    title={
                      isFullScreen ? "Exit Full Screen" : "Enter Full Screen"
                    }
                  >
                    {isFullScreen ? (
                      <Minimize className="h-4 w-4" />
                    ) : (
                      <Maximize className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}

              {/* Controls */}
              <div className="bg-white/80 dark:bg-white/10 rounded-lg p-6 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center space-x-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 w-16 h-16"
                    onClick={togglePlay}
                    disabled={!microphoneReady || isInitializing}
                  >
                    {isPlaying ? (
                      <Pause className="h-8 w-8" />
                    ) : isPaused ? (
                      <Play className="h-8 w-8" />
                    ) : (
                      <Play className="h-8 w-8" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-12 h-12"
                    onClick={handleStopGame}
                    title="Stop Game"
                  >
                    <Square className="h-6 w-6" />
                  </Button>

                  <div className="text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {isPlaying
                        ? "Click to pause"
                        : isPaused
                        ? "Click to resume"
                        : "Click to start singing"}
                    </div>
                    {!microphoneReady && (
                      <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        ⏳ Microphone initializing...
                      </div>
                    )}
                    {microphoneReady && !isInitializing && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {(() => {
                          const audioPlayer = getAudioPlayer();
                          if (audioPlayer && audioPlayer.isReadyToPlay()) {
                            return "🎵 Ready to play";
                          } else if (audioPlayer) {
                            return "⏳ Audio loading...";
                          } else {
                            return "🎵 Ready to play";
                          }
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="bg-white/80 dark:bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center space-x-4">
                  <Link href="/songs">
                    <Button
                      variant="outline"
                      className="text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Music className="h-4 w-4 mr-2" />
                      Choose Different Song
                    </Button>
                  </Link>
                  <Link href="/songs">
                    <Button
                      variant="outline"
                      className="text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Songs
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Debug Info - Only show on localhost */}
              {isLocalhost && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Debug Info:</strong>
                      <br />
                      Song: {currentSong.title} ✅
                      <br />
                      Audio Player: {audioPlayer ? "✅" : "❌"}
                      <br />
                      Audio Ready: {audioPlayer?.isReadyToPlay() ? "✅" : "❌"}
                      <br />
                      Lyrics Loaded: {lyricsLoaded ? "✅" : "❌"}
                      <br />
                      Current Lyric:{" "}
                      {currentLyric ? `"${currentLyric}"` : "None"}
                      <br />
                      Microphone: {microphoneReady ? "✅" : "❌"}
                      <br />
                      Playing: {isPlaying ? "✅" : "❌"}
                      <br />
                      Paused: {isPaused ? "⏸️" : "❌"}
                      <br />
                      Recording: {isRecording ? "🎤" : "⏹️"}
                      <br />
                      Volume: {Math.round(volumeLevel)}%
                      <br />
                      Accuracy: {accuracy}% | Timing: {timing}% %
                      <br />
                      Scoring Events: {scoringEvents} (cumulative average)
                      <br />
                      Time: {formatTime(currentTime / 1000)}
                      <br />
                      Duration:{" "}
                      {audioPlayer
                        ? formatTime(audioPlayer.getState().duration)
                        : "N/A"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Challenge Context - Show if in challenge mode */}
            {challenge && challengeId && currentUserId && (
              <div className="lg:col-span-1">
                <div className="sticky top-4">
                  <ChallengeContext
                    challenge={challenge}
                    currentUserId={currentUserId}
                  />
                </div>
              </div>
            )}

            {/* Leaderboard Section */}
            <div className="lg:col-span-1">
              <div className="bg-white/80 dark:bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-gray-200 dark:border-gray-700 sticky top-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    🏆 Leaderboard
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {currentSong.title}
                  </span>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                  {leaderboardLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-gray-500 dark:text-gray-400 text-sm">
                        Loading leaderboard...
                      </div>
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                      <div className="text-4xl mb-3">🎤</div>
                      <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                        No high score yet!
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Be the first to set the bar and claim your spot on the
                        leaderboard! 🏆
                      </div>
                    </div>
                  ) : (
                    leaderboard.map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          entry.rank <= 3
                            ? "bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border border-yellow-200 dark:border-yellow-700"
                            : "bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600/50"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              entry.rank === 1
                                ? "bg-yellow-500 text-white"
                                : entry.rank === 2
                                ? "bg-gray-400 text-white"
                                : entry.rank === 3
                                ? "bg-amber-600 text-white"
                                : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {entry.rank}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                              {entry.player}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Level {entry.level} - {getLevelTitle(entry.level)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {entry.score.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Points
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    {userBestScore ? (
                      <>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Your Best Score
                        </p>
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                          <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                            {userBestScore.score.toLocaleString()} points
                          </div>
                          {userBestScore.rank && (
                            <div className="text-xs text-gray-600 dark:text-gray-300">
                              Rank #{userBestScore.rank} on leaderboard
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Your best score will appear here
                        </p>
                        <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3">
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            Play to see your ranking!
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gameplay Events Display */}
        <GameplayEventDisplay events={events} />

        {/* Stop Confirmation Modal */}
        {showStopModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 shadow-xl">
              <div className="text-center">
                <div className="text-2xl mb-4">🛑</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  End Session & Save Score?
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  This will end your current session and save your progress to
                  the database. Your score and experience will be recorded.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  If you refresh the page or navigate away without clicking
                  &quot;End Session&quot;, no progress will be saved.
                </p>
                <div className="flex space-x-4 justify-center">
                  <Button
                    variant="outline"
                    onClick={cancelStopGame}
                    className="text-gray-600 dark:text-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmStopGame}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    End Session & Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Modal */}
        {showHelpModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowHelpModal(false)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto relative custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowHelpModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Close"
              >
                <XCircle className="h-6 w-6" />
              </button>

              <div className="text-center mb-6">
                <div className="text-3xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  How Scoring Works
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Understanding your karaoke performance scores
                </p>
              </div>

              <div className="space-y-6 text-left">
                {/* Real-time vs Final Scores */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    📊 Real-Time vs Final Scores
                  </h4>
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    <strong>Real-time scores</strong> show your performance as
                    you sing.
                    <strong>Final scores</strong> are the same as your real-time
                    scores when you stop - they represent your performance for
                    the portion of the song you completed.
                  </p>
                </div>

                {/* Scoring Components */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    🎵 Scoring Components
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-green-600 dark:text-green-400 font-semibold text-sm">
                          A
                        </span>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          Accuracy (50% weight)
                        </h5>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          How well you match the lyrics. Compares your words to
                          the expected lyrics.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                          T
                        </span>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          Timing (30% weight)
                        </h5>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          How well you match the rhythm. Based on when you sing
                          compared to the song timing.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-purple-600 dark:text-purple-400 font-semibold text-sm">
                          P
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* How Scores Are Calculated */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    🧮 How Scores Are Calculated
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      <strong>Real-time scores</strong> are running averages of
                      your performance so far:
                    </p>
                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 ml-4">
                      <li>• Each phrase you sing gets scored (0-100%)</li>
                      <li>
                        • Your overall score is the average of all phrases
                      </li>
                      <li>• Early phrases have more impact on your average</li>
                      <li>
                        • Later phrases have less impact (running average
                        stabilizes)
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Important Notes */}
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                    ⚠️ Important Notes
                  </h4>
                  <ul className="text-amber-800 dark:text-amber-200 text-sm space-y-1">
                    <li>
                      • <strong>No penalty for stopping early</strong> - scores
                      reflect only what you sang
                    </li>
                    <li>
                      • <strong>Fair scoring</strong> - you&apos;re only judged
                      on your actual performance
                    </li>
                    <li>
                      • <strong>Realistic feedback</strong> - scores show your
                      singing ability, not song completion
                    </li>
                    <li>
                      • <strong>Encourages participation</strong> - no
                      artificial limits or penalties
                    </li>
                  </ul>
                </div>

                {/* Example */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    📝 Example
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Song:</strong> 5-minute song with 100 phrases
                      <br />
                      <strong>You stop:</strong> After 2.5 minutes (50 phrases)
                      <br />
                      <strong>Your scores:</strong> 85% Accuracy, 78% Timing
                      <br />
                      <strong>Result:</strong> These scores reflect your
                      performance on the 50 phrases you sang, not a percentage
                      of the total possible score.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <Button
                  onClick={() => setShowHelpModal(false)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Got it!
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Scoring Modal */}
        {showScoringModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowScoringModal(false)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto relative custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowScoringModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Close"
              >
                <XCircle className="h-6 w-6" />
              </button>

              <div className="text-center mb-6">
                <div className="text-3xl mb-4">🏆</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Scoring & Leveling System
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  How experience points, levels, and scoring work
                </p>
              </div>

              <div className="space-y-6 text-left">
                {/* Experience Points */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    ⭐ Experience Points (XP)
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                    Earn XP by playing songs! Your performance determines how
                    much XP you gain.
                  </p>
                  <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
                    <p>
                      <strong>Base XP:</strong> 0-50 points from your total
                      score
                    </p>
                    <p>
                      <strong>Performance Bonuses:</strong> +0-30 for accuracy,
                      +0-20 for timing
                    </p>
                    <p>
                      <strong>Perfect Bonus:</strong> +25 XP if all scores &gt;
                      90%
                    </p>
                    <p>
                      <strong>Difficulty Multiplier:</strong> Easy (0.8x),
                      Medium (1.0x), Hard (1.3x)
                    </p>
                  </div>
                </div>

                {/* Level Requirements */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    📈 Level Requirements
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Level 1-5
                      </div>
                      <div className="text-gray-600 dark:text-gray-300">
                        100-700 XP
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Level 6-10
                      </div>
                      <div className="text-gray-600 dark:text-gray-300">
                        1,000-2,700 XP
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Level 11-25
                      </div>
                      <div className="text-gray-600 dark:text-gray-300">
                        3,250-15,600 XP
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Level 26+
                      </div>
                      <div className="text-gray-600 dark:text-gray-300">
                        20,000+ XP
                      </div>
                    </div>
                  </div>
                </div>

                {/* Level Titles */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    🎖️ Level Titles
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                      <span className="text-gray-500">Level 1</span>
                      <span className="font-semibold text-gray-500">
                        Beginner
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      <span className="text-green-600">Level 5</span>
                      <span className="font-semibold text-green-600">
                        Novice
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <span className="text-blue-600">Level 15</span>
                      <span className="font-semibold text-blue-600">
                        Amateur
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                      <span className="text-purple-600">Level 30</span>
                      <span className="font-semibold text-purple-600">
                        Professional
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-pink-50 dark:bg-pink-900/20 rounded">
                      <span className="text-pink-600">Level 50</span>
                      <span className="font-semibold text-pink-600">
                        Expert
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                      <span className="text-yellow-600">Level 75</span>
                      <span className="font-semibold text-yellow-600">
                        Master
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                      <span className="text-orange-600">Level 100</span>
                      <span className="font-semibold text-orange-600">
                        Legend
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                      <span className="text-red-600">Level 150</span>
                      <span className="font-semibold text-red-600">
                        Karaoke God
                      </span>
                    </div>
                  </div>
                </div>

                {/* XP Examples */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    💡 XP Examples
                  </h4>
                  <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                    <p>
                      <strong>Perfect Performance (90%+ all scores):</strong>
                    </p>
                    <ul className="ml-4 space-y-1">
                      <li>• Easy Song: ~120 XP</li>
                      <li>• Medium Song: ~150 XP</li>
                      <li>• Hard Song: ~195 XP</li>
                    </ul>
                    <p className="mt-2">
                      <strong>Good Performance (70% average):</strong>
                    </p>
                    <ul className="ml-4 space-y-1">
                      <li>• Easy Song: ~60 XP</li>
                      <li>• Medium Song: ~75 XP</li>
                      <li>• Hard Song: ~98 XP</li>
                    </ul>
                  </div>
                </div>

                {/* Leveling Timeline */}
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                    ⏱️ Leveling Timeline
                  </h4>
                  <div className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
                    <p>
                      <strong>Level 1 → 2:</strong> ~1-2 good games (100 XP
                      needed)
                    </p>
                    <p>
                      <strong>Level 5 → 6:</strong> ~2-4 good games (300 XP
                      needed)
                    </p>
                    <p>
                      <strong>Level 10 → 11:</strong> ~4-8 good games (550 XP
                      needed)
                    </p>
                    <p>
                      <strong>Level 25 → 26:</strong> ~15-30 good games (2,000
                      XP needed)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <Button
                  onClick={() => setShowScoringModal(false)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Got it!
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function GameplayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading gameplay...
            </p>
          </div>
        </div>
      }
    >
      <GameplayContent />
    </Suspense>
  );
}
