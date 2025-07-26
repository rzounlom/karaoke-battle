"use client";

import {
  ArrowLeft,
  Mic,
  MicOff,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { formatScore, formatTime } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

// Mock lyrics with timestamps
const mockLyrics = [
  { time: 0, text: "Is this the real life?" },
  { time: 3, text: "Is this just fantasy?" },
  { time: 6, text: "Caught in a landslide" },
  { time: 9, text: "No escape from reality" },
  { time: 12, text: "Open your eyes" },
  { time: 15, text: "Look up to the skies and see" },
  { time: 18, text: "I'm just a poor boy" },
  { time: 21, text: "I need no sympathy" },
  { time: 24, text: "Because I'm easy come, easy go" },
  { time: 27, text: "Little high, little low" },
];

export default function GameplayPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime] = useState(180); // 3 minutes
  const [score, setScore] = useState(0);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [multiplayerPlayers] = useState([
    { name: "John", score: 7200, isCurrent: false },
    { name: "Sarah", score: 6800, isCurrent: false },
    { name: "You", score: 8450, isCurrent: true },
  ]);

  const intervalRef = useRef<any>();

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const newTime = prev + 1;

          // Update current lyric based on time
          const lyricIndex =
            mockLyrics.findIndex((lyric) => lyric.time > newTime) - 1;
          if (lyricIndex !== currentLyricIndex && lyricIndex >= 0) {
            setCurrentLyricIndex(lyricIndex);
            // Simulate scoring
            const newScore = score + Math.floor(Math.random() * 100) + 50;
            setScore(newScore);
            setAccuracy(Math.floor(Math.random() * 20) + 80);
            setFeedback("Perfect! +100 pts");
            setShowFeedback(true);
            setTimeout(() => setShowFeedback(false), 2000);
          }

          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentLyricIndex, score]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const progress = (currentTime / totalTime) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-white">
            <h1 className="text-lg font-semibold">Bohemian Rhapsody</h1>
            <p className="text-sm text-white/70">Queen</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-center text-white">
            <div className="text-2xl font-bold score-pulse">
              {formatScore(score)}
            </div>
            <div className="text-sm text-white/70">Score</div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Gameplay Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Progress Bar */}
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-medium">
                  {formatTime(currentTime)}
                </span>
                <span className="text-white/70">{formatTime(totalTime)}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Lyrics Display */}
            <div className="bg-white/10 rounded-xl p-8 text-center min-h-[400px] flex flex-col justify-center">
              {currentLyricIndex < mockLyrics.length ? (
                <div className="space-y-8">
                  {/* Current Lyric */}
                  <div className="space-y-4">
                    <div className="lyrics-text text-white">
                      {mockLyrics[currentLyricIndex].text}
                    </div>

                    {/* Next Lyric Preview */}
                    {currentLyricIndex + 1 < mockLyrics.length && (
                      <div className="text-2xl md:text-3xl text-white/50">
                        {mockLyrics[currentLyricIndex + 1].text}
                      </div>
                    )}
                  </div>

                  {/* Real-time Feedback */}
                  {showFeedback && (
                    <div className="text-3xl font-bold text-green-400 lyrics-highlight">
                      {feedback}
                    </div>
                  )}

                  {/* Accuracy Indicator */}
                  <div className="flex justify-center items-center space-x-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {accuracy}%
                      </div>
                      <div className="text-sm text-white/70">Accuracy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">🎯</div>
                      <div className="text-sm text-white/70">Timing</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-white text-2xl">Song Complete!</div>
              )}
            </div>

            {/* Audio Controls */}
            <div className="bg-white/10 rounded-lg p-6">
              <div className="flex items-center justify-center space-x-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                >
                  <SkipBack className="h-6 w-6" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 w-16 h-16"
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="h-8 w-8" />
                  ) : (
                    <Play className="h-8 w-8" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                >
                  <SkipForward className="h-6 w-6" />
                </Button>
              </div>

              <div className="flex justify-center items-center space-x-4 mt-4">
                <Button
                  variant={isRecording ? "karaoke" : "outline"}
                  size="sm"
                  onClick={toggleRecording}
                  className="text-white"
                >
                  {isRecording ? (
                    <Mic className="mr-2 h-4 w-4" />
                  ) : (
                    <MicOff className="mr-2 h-4 w-4" />
                  )}
                  {isRecording ? "Recording" : "Start Recording"}
                </Button>

                <Button variant="outline" size="sm" className="text-white">
                  <Volume2 className="mr-2 h-4 w-4" />
                  Mute Music
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar - Multiplayer Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Multiplayer Players */}
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Players
              </h3>
              <div className="space-y-3">
                {multiplayerPlayers.map((player, index) => (
                  <div
                    key={player.name}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      player.isCurrent
                        ? "bg-purple-500/30 border border-purple-400"
                        : "bg-white/5"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {player.name}
                        </div>
                        <div className="text-white/70 text-sm">
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
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-4">Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/70">Current Streak</span>
                  <span className="text-white font-medium">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Perfect Notes</span>
                  <span className="text-white font-medium">45</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Timing Score</span>
                  <span className="text-white font-medium">92%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Pitch Score</span>
                  <span className="text-white font-medium">88%</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-white"
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  View Leaderboard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-white"
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
  );
}
