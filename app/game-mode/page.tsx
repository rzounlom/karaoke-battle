"use client";

import { ArrowLeft, Mic, Play, Settings, Trophy, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";

const gameModes = [
  {
    id: "single",
    title: "Single Player",
    description: "Practice mode - perfect your skills without pressure",
    icon: Mic,
    features: [
      "Solo performance",
      "No pressure",
      "Practice timing",
      "Improve accuracy",
    ],
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    id: "multiplayer",
    title: "Multiplayer Battle",
    description: "Compete with friends in real-time battles",
    icon: Users,
    features: [
      "Real-time competition",
      "Live leaderboards",
      "Voice chat",
      "Instant feedback",
    ],
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
  },
  {
    id: "tournament",
    title: "Tournament Mode",
    description: "Join championships with multiple rounds",
    icon: Trophy,
    features: [
      "Multiple rounds",
      "Elimination brackets",
      "Championship prizes",
      "Global rankings",
    ],
    color: "from-yellow-500 to-orange-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
  },
];

export default function GameModePage() {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState("");

  const selectedGameMode = gameModes.find((mode) => mode.id === selectedMode);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold karaoke-text-gradient">
            Choose Game Mode
          </h1>
        </div>
        <ThemeToggle />
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Game Modes */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {gameModes.map((mode) => (
                <div
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`${
                    mode.bgColor
                  } rounded-xl p-6 border-2 cursor-pointer transition-all hover:shadow-lg ${
                    selectedMode === mode.id
                      ? "border-purple-500 shadow-lg"
                      : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
                  }`}
                >
                  <div
                    className={`w-12 h-12 bg-gradient-to-r ${mode.color} rounded-lg flex items-center justify-center mb-4`}
                  >
                    <mode.icon className="h-6 w-6 text-white" />
                  </div>

                  <h3 className="text-xl font-semibold mb-2">{mode.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                    {mode.description}
                  </p>

                  <ul className="space-y-2">
                    {mode.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center text-sm text-gray-600 dark:text-gray-400"
                      >
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Room Code Section */}
            {selectedMode === "multiplayer" && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4">
                  Join or Create Room
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Room Code
                    </label>
                    <input
                      type="text"
                      placeholder="Enter room code..."
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="karaoke" className="flex-1">
                      <Play className="mr-2 h-4 w-4" />
                      Join Room
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Create New Room
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Tournament Info */}
            {selectedMode === "tournament" && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4">
                  Active Tournaments
                </h3>
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">Weekly Championship</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Rock & Pop Classics
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          32 participants • 4 rounds
                        </p>
                      </div>
                      <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        Active
                      </span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">Monthly Masters</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          All Genres Welcome
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          128 participants • 7 rounds
                        </p>
                      </div>
                      <span className="bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        Starting Soon
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mode Details */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 sticky top-6">
              {selectedGameMode ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div
                      className={`w-16 h-16 bg-gradient-to-r ${selectedGameMode.color} rounded-lg flex items-center justify-center mx-auto mb-4`}
                    >
                      <selectedGameMode.icon className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">
                      {selectedGameMode.title}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedGameMode.description}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Link href="/gameplay">
                      <Button variant="karaoke" className="w-full py-3">
                        <Play className="mr-2 h-5 w-5" />
                        Start {selectedGameMode.title}
                      </Button>
                    </Link>

                    {selectedMode === "single" && (
                      <Button variant="outline" className="w-full py-3">
                        <Settings className="mr-2 h-4 w-4" />
                        Practice Settings
                      </Button>
                    )}

                    {selectedMode === "multiplayer" && (
                      <Button variant="outline" className="w-full py-3">
                        <Users className="mr-2 h-4 w-4" />
                        Invite Friends
                      </Button>
                    )}

                    {selectedMode === "tournament" && (
                      <Button variant="outline" className="w-full py-3">
                        <Trophy className="mr-2 h-4 w-4" />
                        View Rankings
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold">What to Expect</h3>
                    <ul className="space-y-2 text-sm">
                      {selectedGameMode.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a game mode to continue</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
