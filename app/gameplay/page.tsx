"use client";

import {
  ArrowLeft,
  Heart,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Target,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { formatScore, formatTime } from "@/lib/utils";

import { AudioTest } from "@/components/audio-test";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MicrophoneTest } from "@/components/microphone-test";
import { ProtectedRoute } from "@/components/protected-route";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfile } from "@/components/user-profile";
import { getSongById } from "@/lib/songs-data";
import { useKaraokeGameplay } from "@/hooks/use-karaoke-gameplay";
import { useSearchParams } from "next/navigation";

function GameplayContent() {
  const searchParams = useSearchParams();
  const songId = searchParams.get("songId") || "bohemian-rhapsody";
  const mode = searchParams.get("mode") || "single";

  // Get song data based on URL parameter
  const currentSong = getSongById(songId);
  console.log("🎵 Song ID from URL:", songId);
  console.log("🎵 Current song found:", currentSong);
  const [showStopModal, setShowStopModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Use the new karaoke gameplay hook
  const {
    // State
    isPlaying,
    isRecording,
    isVoiceActive,
    currentTime,
    score,
    accuracy,
    timing,
    pitch,
    transcript,
    volumeLevel,
    microphoneReady,
    error: gameplayError,
    feedback,
    showFeedback,
    currentStreak,
    perfectNotes,
    isListening,
    voiceError,

    // Actions
    loadSong,
    startGame,
    stopGame,
    resetGame,

    // Audio player methods
    getAudioPlayer,
    getCurrentSong,
  } = useKaraokeGameplay({
    onScoreUpdate: (newScore, newAccuracy, newTiming, newPitch) => {
      console.log("🎯 Score update:", {
        newScore,
        newAccuracy,
        newTiming,
        newPitch,
      });
    },
    onGameEnd: (finalScore, totalAccuracy) => {
      console.log("🎮 Game ended:", { finalScore, totalAccuracy });
      // TODO: Navigate to results page
    },
    voiceThreshold: 0.02,
  });

  const [multiplayerPlayers] = useState([
    { name: "John", score: 7200, isCurrent: false, avatar: "J" },
    { name: "Sarah", score: 6800, isCurrent: false, avatar: "S" },
    { name: "You", score: 8450, isCurrent: true, avatar: "Y" },
  ]);

  // Load song when component mounts
  useEffect(() => {
    if (currentSong) {
      console.log("🎵 Loading song:", currentSong.title);
      console.log("🎵 Song details:", currentSong);

      loadSong(currentSong)
        .then((success) => {
          if (success) {
            console.log("✅ Song loaded successfully");
            const audioPlayer = getAudioPlayer();
            if (audioPlayer) {
              console.log("🎵 Audio player state:", audioPlayer.getState());
              console.log("🎵 Ready to play:", audioPlayer.isReadyToPlay());
            }
          } else {
            console.error("❌ Failed to load song");
          }
        })
        .catch((error) => {
          console.error("❌ Error loading song:", error);
        });
    }
  }, [currentSong, loadSong, getAudioPlayer]);

  const togglePlay = async () => {
    if (isPlaying) {
      // Show stop confirmation modal
      setShowStopModal(true);
    } else {
      // Start both audio and recording
      if (!microphoneReady) {
        console.warn("Microphone not ready yet");
        alert(
          "Microphone is still initializing. Please wait a moment and try again."
        );
        return;
      }

      const audioPlayer = getAudioPlayer();
      if (!audioPlayer) {
        console.warn("Audio player not initialized");
        alert("Audio player not initialized. Please refresh the page.");
        return;
      }

      if (!audioPlayer.isReadyToPlay()) {
        console.warn("Audio player not ready to play");
        alert("Audio is still loading. Please wait a moment and try again.");
        return;
      }

      try {
        console.log("🎮 Starting karaoke gameplay...");
        await startGame();
        console.log("✅ Karaoke gameplay started successfully");
      } catch (error) {
        console.error("❌ Failed to start gameplay:", error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        alert(`Failed to start gameplay: ${errorMsg}`);
      }
    }
  };

  const confirmStop = () => {
    stopGame();
    setShowStopModal(false);
    // TODO: Navigate to results page or show final score
  };

  const cancelStop = () => {
    setShowStopModal(false);
  };

  const toggleMute = () => {
    const audioPlayer = getAudioPlayer();
    if (audioPlayer) {
      if (isMuted) {
        audioPlayer.unmute();
      } else {
        audioPlayer.mute();
      }
    }
    setIsMuted(!isMuted);
  };

  const audioPlayer = getAudioPlayer();
  const progress =
    currentSong && currentSong.duration
      ? (currentTime / (currentSong.duration * 1000)) * 100
      : audioPlayer && audioPlayer.getState().duration > 0
      ? (currentTime / audioPlayer.getState().duration) * 100
      : 0;

  // Safety check for song not found
  if (!currentSong) {
    console.error("GameplayContent: Song not found for ID:", songId);
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Link href="/game-mode">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="text-gray-900 dark:text-white">
              <h1 className="text-lg font-semibold">
                {currentSong?.title || "Loading..."}
              </h1>
              <p className="text-sm text-gray-600 dark:text-white/70">
                {currentSong?.artist || "Loading..."}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-center text-gray-900 dark:text-white">
              <div className="text-2xl font-bold score-pulse">
                {formatScore(score)}
              </div>
              <div className="text-sm text-gray-600 dark:text-white/70">
                Score
              </div>
            </div>
            <UserProfile />
            <ThemeToggle />
          </div>
        </header>

        <div className="container mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Main Gameplay Area */}
            <div className="lg:col-span-3 space-y-6">
              {/* Progress Bar */}
              <div className="bg-white/80 dark:bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-900 dark:text-white font-medium">
                    {formatTime(currentTime / 1000)}
                  </span>
                  <span className="text-gray-600 dark:text-white/70">
                    {currentSong && currentSong.duration
                      ? formatTime(currentSong.duration)
                      : audioPlayer
                      ? formatTime(audioPlayer.getState().duration / 1000)
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

              {/* Debug Info - Temporary */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800 mb-4">
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Debug Info:</strong>
                  <br />
                  Song ID: {songId}
                  <br />
                  Song Found: {currentSong ? "✅" : "❌"}
                  <br />
                  Audio Player: {audioPlayer ? "✅" : "❌"}
                  <br />
                  Audio Ready: {audioPlayer?.debugReadyToPlay() ? "✅" : "❌"}
                  <br />
                  Microphone: {microphoneReady ? "✅" : "❌"}
                  <br />
                  Playing: {isPlaying ? "✅" : "❌"}
                  <br />
                  Recording: {isRecording ? "🎤" : "⏹️"}
                  <br />
                  Voice: {isVoiceActive ? "🗣️" : "🤫"}
                  <br />
                  Volume:{" "}
                  {isFinite(volumeLevel) ? Math.round(volumeLevel) : "N/A"}%
                  <br />
                  Time: {formatTime(currentTime / 1000)}
                  <br />
                  Duration:{" "}
                  {audioPlayer
                    ? formatTime(audioPlayer.getState().duration / 1000)
                    : "N/A"}
                </div>
              </div>

              {/* Lyrics Display */}
              <div className="bg-white/80 dark:bg-white/10 rounded-xl p-8 text-center min-h-[400px] flex flex-col justify-center backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                {currentSong ? (
                  <div className="space-y-8">
                    {/* Current Lyric */}
                    <div className="space-y-4">
                      {(() => {
                        if (!audioPlayer) {
                          return (
                            <div className="lyrics-text text-gray-900 dark:text-white">
                              Loading lyrics...
                            </div>
                          );
                        }

                        const currentLyric = audioPlayer.getCurrentLyric();
                        const upcomingLyrics = audioPlayer.getUpcomingLyrics(2);

                        return (
                          <>
                            <div className="lyrics-text text-gray-900 dark:text-white">
                              {currentLyric || "Get ready..."}
                            </div>

                            {/* Next Lyric Preview */}
                            {upcomingLyrics.length > 0 && (
                              <div className="text-2xl md:text-3xl text-gray-600 dark:text-white/50">
                                {upcomingLyrics[0] || ""}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Real-time Feedback */}
                    {showFeedback && (
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400 lyrics-highlight">
                        {feedback}
                      </div>
                    )}

                    {/* Error Display */}
                    {(voiceError || gameplayError) && (
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                        <div className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">
                          Error:
                        </div>
                        <div className="text-gray-900 dark:text-white mb-2">
                          {voiceError || gameplayError || "Unknown error"}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          <div>
                            <p>
                              • Check your browser&apos;s microphone permissions
                            </p>
                            <p>• Try refreshing the page</p>
                            <p>• Make sure your microphone is connected</p>
                            <p>• Grant microphone access when prompted</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Voice Activity Status */}
                    {isVoiceActive && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                        <div className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">
                          🎤 Voice Detected!
                        </div>
                        <div className="text-gray-900 dark:text-white">
                          Keep singing! Your voice is being captured for
                          scoring.
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Volume Level: {Math.round(volumeLevel)}%
                        </div>
                      </div>
                    )}

                    {/* Performance Indicators */}
                    <div className="flex justify-center items-center space-x-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center">
                          <Target className="h-5 w-5 mr-1" />
                          {accuracy}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-white/70">
                          Accuracy
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center">
                          <Zap className="h-5 w-5 mr-1" />
                          {timing}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-white/70">
                          Timing
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center">
                          <Heart className="h-5 w-5 mr-1" />
                          {pitch}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-white/70">
                          Pitch
                        </div>
                      </div>
                    </div>
                  </div>
                ) : currentSong ? (
                  <div className="text-gray-900 dark:text-white text-2xl">
                    Song Complete!
                  </div>
                ) : (
                  <div className="text-center text-gray-900 dark:text-white">
                    <div className="text-2xl font-bold mb-4">
                      Song Not Found
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 mb-6">
                      The selected song could not be loaded. Please try
                      selecting a different song.
                    </div>
                    <Link href="/songs">
                      <Button variant="karaoke">Choose Another Song</Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Audio Controls */}
              <div className="bg-white/80 dark:bg-white/10 rounded-lg p-6 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center space-x-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
                  >
                    <SkipBack className="h-6 w-6" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 w-16 h-16"
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="h-8 w-8" />
                    ) : (
                      <Play className="h-8 w-8" />
                    )}
                  </Button>
                  <div className="text-center mt-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {isPlaying
                        ? "Click to stop and score"
                        : "Click to start singing"}
                    </div>
                    {isRecording && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        🎤 Recording...
                      </div>
                    )}
                    {audioPlayer && microphoneReady ? (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        🎵 Ready to Play
                      </div>
                    ) : (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        ⏳ Loading...
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
                  >
                    <SkipForward className="h-6 w-6" />
                  </Button>
                </div>

                <div className="flex justify-center items-center space-x-4 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-900 dark:text-white"
                    onClick={toggleMute}
                  >
                    {isMuted ? (
                      <VolumeX className="mr-2 h-4 w-4" />
                    ) : (
                      <Volume2 className="mr-2 h-4 w-4" />
                    )}
                    {isMuted ? "Unmute" : "Mute Music"}
                  </Button>

                  {/* Test Audio Button - Temporary */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-900 dark:text-white"
                    onClick={() => {
                      if (audioPlayer) {
                        console.log("=== AUDIO DEBUG INFO ===");
                        console.log(
                          "Audio Player Debug:",
                          audioPlayer.getDebugInfo()
                        );
                        console.log(
                          "Ready to play:",
                          audioPlayer.debugReadyToPlay()
                        );
                        console.log("========================");

                        if (audioPlayer.getState().isPlaying) {
                          audioPlayer.pause();
                        } else {
                          console.log("Attempting to play via test button...");
                          audioPlayer
                            .play()
                            .then(() => {
                              console.log("✅ Test play succeeded!");
                            })
                            .catch((e) => {
                              console.error("❌ Test play failed:", e);
                              alert(`Play failed: ${e.message}`);
                            });
                        }
                      } else {
                        console.error("No audio player available");
                      }
                    }}
                  >
                    🎵 Debug & Test
                  </Button>

                  {/* Manual Load Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-900 dark:text-white"
                    onClick={() => {
                      if (currentSong) {
                        console.log("🔄 Manually loading song...");
                        loadSong(currentSong)
                          .then((success) => {
                            console.log("Manual load result:", success);
                            alert(
                              success
                                ? "Song loaded successfully!"
                                : "Failed to load song"
                            );
                          })
                          .catch((error) => {
                            console.error("Manual load error:", error);
                            alert(`Load error: ${error.message}`);
                          });
                      } else {
                        alert("No song selected");
                      }
                    }}
                  >
                    🔄 Manual Load
                  </Button>
                </div>
              </div>
            </div>

            {/* Sidebar - Multiplayer Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Multiplayer Players */}
              <div className="bg-white/80 dark:bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-gray-900 dark:text-white font-semibold mb-4 flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Players
                </h3>
                <div className="space-y-3">
                  {multiplayerPlayers.map((player, index) => (
                    <div
                      key={player.name}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                        player.isCurrent
                          ? "bg-purple-500/30 border border-purple-400 shadow-lg"
                          : "bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {player.avatar}
                        </div>
                        <div>
                          <div className="text-gray-900 dark:text-white font-medium">
                            {player.name}
                          </div>
                          <div className="text-gray-600 dark:text-white/70 text-sm">
                            {formatScore(player.score)} pts
                          </div>
                        </div>
                      </div>
                      {player.isCurrent && (
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Stats */}
              <div className="bg-white/80 dark:bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-gray-900 dark:text-white font-semibold mb-4">
                  Performance
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-white/70">
                      Current Streak
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {currentStreak}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-white/70">
                      Perfect Notes
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {perfectNotes}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-white/70">
                      Timing Score
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {timing}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-white/70">
                      Pitch Score
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {pitch}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Microphone Test - Temporary for debugging */}
              <MicrophoneTest />

              {/* Audio Test - Temporary for debugging */}
              <AudioTest />

              {/* Quick Actions */}
              <div className="bg-white/80 dark:bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-gray-900 dark:text-white font-semibold mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <Link href="/results">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-gray-900 dark:text-white"
                    >
                      <Trophy className="mr-2 h-4 w-4" />
                      View Results
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-gray-900 dark:text-white"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Invite Friends
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stop Confirmation Modal */}
      {showStopModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Pause className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                Stop the Round?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Stopping now will end your performance and calculate your final
                score. Your current progress will be saved.
              </p>

              <div className="space-y-3">
                <Button
                  variant="karaoke"
                  className="w-full"
                  onClick={confirmStop}
                >
                  Stop & Calculate Score
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={cancelStop}
                >
                  Continue Singing
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
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
