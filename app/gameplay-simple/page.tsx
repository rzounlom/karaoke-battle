"use client";

import { ArrowLeft, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ProtectedRoute } from "@/components/protected-route";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfile } from "@/components/user-profile";
import { formatTime } from "@/lib/utils";
import { getSongById } from "@/lib/songs-data";
import { useSearchParams } from "next/navigation";
import { useSimpleKaraoke } from "@/hooks/use-simple-karaoke";

function SimpleGameplayContent() {
  const searchParams = useSearchParams();
  const songId = searchParams.get("songId") || "bohemian-rhapsody";

  const currentSong = getSongById(songId);
  const [isMuted, setIsMuted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const {
    isPlaying,
    isRecording,
    currentTime,
    score,
    accuracy,
    timing,
    pitch,
    pitchHz,
    currentNote,
    transcript,
    volumeLevel,
    microphoneReady,
    error,
    isVoiceActive,
    currentLyric,
    upcomingLyrics,
    lyricsLoaded,
    scoringEvents,
    loadSong,
    startGame,
    stopGame,
    getAudioPlayer,
  } = useSimpleKaraoke({
    onScoreUpdate: (newScore, newAccuracy) => {
      console.log("Score update:", newScore, newAccuracy);
    },
    onGameEnd: (finalScore, totalAccuracy) => {
      console.log("Game ended:", finalScore, totalAccuracy);
    },
  });

  // Load song when component mounts
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (currentSong) {
      setTimeout(async () => {
        const success = await loadSong(currentSong);
        if (success) {
          console.log("✅ Song loaded successfully");
        } else {
          console.error("❌ Failed to load song");
        }
        setIsInitializing(false);
      }, 500);
    }
  }, [currentSong, loadSong]);

  const togglePlay = async () => {
    if (isPlaying) {
      stopGame();
    } else {
      if (!microphoneReady) {
        alert("Microphone is not ready. Please wait a moment and try again.");
        return;
      }

      const audioPlayer = getAudioPlayer();
      if (!audioPlayer || !audioPlayer.isReadyToPlay()) {
        alert(
          "Audio is not ready to play. Please wait a moment and try again."
        );
        return;
      }

      try {
        await startGame();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        alert(`Failed to start gameplay: ${errorMsg}`);
      }
    }
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
    audioPlayer && audioPlayer.getState().duration > 0
      ? (currentTime / (audioPlayer.getState().duration * 1000)) * 100
      : 0;

  if (!currentSong) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Song Not Found</h1>
            <p className="mb-4">The song with ID "{songId}" was not found.</p>
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
              <h1 className="text-lg font-semibold">{currentSong.title}</h1>
              <p className="text-sm text-gray-600 dark:text-white/70">
                {currentSong.artist}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-center text-gray-900 dark:text-white">
              <div className="text-2xl font-bold">{score}</div>
              <div className="text-sm text-gray-600 dark:text-white/70">
                Score
              </div>
            </div>
            <UserProfile />
            <ThemeToggle />
          </div>
        </header>

        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
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
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
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
                    {pitch}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-white/70">
                    Pitch
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {currentNote || "—"}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-white/70">
                    {pitchHz > 0 ? `${Math.round(pitchHz)}Hz` : "Note"}
                  </div>
                  {/* Debug info */}
                  <div className="text-xs text-gray-400">
                    Debug: {pitchHz}Hz, {currentNote}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isVoiceActive ? "🎤" : "🤫"}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-white/70">
                    Voice
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
              </div>
            </div>

            {/* Lyrics Display */}
            <div className="bg-white/80 dark:bg-white/10 rounded-xl p-8 text-center min-h-[400px] flex flex-col justify-center backdrop-blur-sm border border-gray-200 dark:border-gray-700">
              {isInitializing ? (
                <div className="text-gray-900 dark:text-white text-xl">
                  Initializing...
                </div>
              ) : error ? (
                <div className="text-red-600 dark:text-red-400">
                  <div className="text-xl font-bold mb-2">Error</div>
                  <div className="text-sm">{error}</div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Song Lyrics */}
                  <div className="space-y-4">
                    <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                      {currentLyric ||
                        (lyricsLoaded
                          ? "Get ready to sing!"
                          : "Loading lyrics...")}
                    </div>

                    {/* Upcoming Lyrics */}
                    {upcomingLyrics.length > 0 && (
                      <div className="text-xl md:text-2xl text-gray-600 dark:text-white/60">
                        {upcomingLyrics[0]}
                      </div>
                    )}

                    {upcomingLyrics.length > 1 && (
                      <div className="text-lg text-gray-500 dark:text-white/40">
                        {upcomingLyrics[1]}
                      </div>
                    )}
                  </div>

                  {/* Voice Transcription */}
                  {transcript && (
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                      <div className="text-sm text-gray-600 dark:text-white/70 mb-2">
                        Your voice:
                      </div>
                      <div className="text-lg text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                        "{transcript}"
                      </div>
                    </div>
                  )}

                  {/* Voice Activity Indicator */}
                  {isVoiceActive && (
                    <div className="text-green-600 dark:text-green-400 text-lg font-medium">
                      🎤 Voice detected! Keep singing!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="bg-white/80 dark:bg-white/10 rounded-lg p-6 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center space-x-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <VolumeX className="h-6 w-6" />
                  ) : (
                    <Volume2 className="h-6 w-6" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 w-16 h-16"
                  onClick={togglePlay}
                  disabled={!microphoneReady || isInitializing}
                >
                  {isPlaying ? (
                    <Pause className="h-8 w-8" />
                  ) : (
                    <Play className="h-8 w-8" />
                  )}
                </Button>

                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {isPlaying ? "Click to stop" : "Click to start singing"}
                  </div>
                  {!microphoneReady && (
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      ⏳ Microphone initializing...
                    </div>
                  )}
                  {microphoneReady && !isInitializing && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      🎵 Ready to play
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Debug Info */}
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
                Current Lyric: {currentLyric ? `"${currentLyric}"` : "None"}
                <br />
                Microphone: {microphoneReady ? "✅" : "❌"}
                <br />
                Playing: {isPlaying ? "✅" : "❌"}
                <br />
                Recording: {isRecording ? "🎤" : "⏹️"}
                <br />
                Voice Active: {isVoiceActive ? "🗣️" : "🤫"}
                <br />
                Volume: {Math.round(volumeLevel)}%
                <br />
                Accuracy: {accuracy}% | Timing: {timing}% | Pitch: {pitch}%
                <br />
                Scoring Events: {scoringEvents} (cumulative average)
                <br />
                Current Note: {currentNote || "None"} (
                {pitchHz > 0 ? `${Math.round(pitchHz)}Hz` : "No pitch"})
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
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function SimpleGameplayPage() {
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
      <SimpleGameplayContent />
    </Suspense>
  );
}
