"use client";

import {
  ArrowLeft,
  Clock,
  Copy,
  Mic,
  Play,
  Settings,
  Share2,
  Trophy,
  Users,
  Users as UsersIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfile } from "@/components/user-profile";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";

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
    estimatedTime: "3-5 min",
    players: "1 player",
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
    estimatedTime: "5-10 min",
    players: "2-8 players",
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
    estimatedTime: "15-30 min",
    players: "8-32 players",
  },
];

const activeTournaments = [
  {
    id: 1,
    name: "Weekly Championship",
    theme: "Rock & Pop Classics",
    participants: 32,
    rounds: 4,
    status: "Active",
    startTime: "2 hours ago",
    prize: "$500",
  },
  {
    id: 2,
    name: "Monthly Masters",
    theme: "All Genres Welcome",
    participants: 128,
    rounds: 7,
    status: "Starting Soon",
    startTime: "3 days",
    prize: "$2000",
  },
];

export default function GameModePage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [showCopied, setShowCopied] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  const selectedGameMode = gameModes.find((mode) => mode.id === selectedMode);

  const generateRoomCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
  };

  const copyRoomCode = async () => {
    if (roomCode) {
      await navigator.clipboard.writeText(roomCode);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const handleStartGame = () => {
    if (!isLoaded) return; // Still loading auth state

    // Get song ID from URL params
    const searchParams = new URLSearchParams(window.location.search);
    const songId = searchParams.get("songId") || "bohemian-rhapsody";

    // Determine destination based on selected game mode
    let intendedDestination = `/gameplay?songId=${songId}`;
    if (selectedMode === "multiplayer") {
      intendedDestination = `/gameplay?songId=${songId}&mode=multiplayer`;
    } else if (selectedMode === "tournament") {
      intendedDestination = `/gameplay?songId=${songId}&mode=tournament`;
    }

    if (!isSignedIn) {
      setShowSignInPrompt(true);
      // Store the intended destination for after sign-in
      sessionStorage.setItem("intendedDestination", intendedDestination);
      return;
    }

    // User is signed in, navigate to gameplay
    router.push(intendedDestination);
  };

  const handleSignIn = () => {
    // Close the modal and redirect to sign-in with return URL
    setShowSignInPrompt(false);
    const intendedDestination =
      sessionStorage.getItem("intendedDestination") || "/gameplay";
    const returnUrl = encodeURIComponent(intendedDestination);
    router.push(`/sign-in?redirect_url=${returnUrl}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <Link href="/songs">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold karaoke-text-gradient">
            Choose Game Mode
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <UserProfile />
          <ThemeToggle />
        </div>
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
                  } rounded-xl p-6 border-2 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                    selectedMode === mode.id
                      ? "border-purple-500 shadow-lg scale-[1.02]"
                      : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
                  }`}
                >
                  <div
                    className={`w-12 h-12 bg-gradient-to-r ${mode.color} rounded-lg flex items-center justify-center mb-4`}
                  >
                    <mode.icon className="h-6 w-6 text-white" />
                  </div>

                  <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                    {mode.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                    {mode.description}
                  </p>

                  <div className="flex items-center justify-between mb-4 text-sm">
                    <div className="flex items-center space-x-1 text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{mode.estimatedTime}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-500">
                      <UsersIcon className="h-3 w-3" />
                      <span>{mode.players}</span>
                    </div>
                  </div>

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
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Join or Create Room
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Room Code
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Enter room code..."
                        value={roomCode}
                        onChange={(e) =>
                          setRoomCode(e.target.value.toUpperCase())
                        }
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        maxLength={6}
                      />
                      <Button
                        variant="outline"
                        onClick={copyRoomCode}
                        disabled={!roomCode}
                        className="px-4"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {showCopied && (
                      <p className="text-sm text-green-600 mt-1">
                        Room code copied!
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="karaoke"
                      className="flex-1"
                      disabled={!roomCode}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Join Room
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={generateRoomCode}
                    >
                      Create New Room
                    </Button>
                  </div>
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-purple-600"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share with Friends
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Tournament Info */}
            {selectedMode === "tournament" && (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Active Tournaments
                </h3>
                <div className="space-y-4">
                  {activeTournaments.map((tournament) => (
                    <div
                      key={tournament.id}
                      className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {tournament.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {tournament.theme}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>{tournament.participants} participants</span>
                            <span>•</span>
                            <span>{tournament.rounds} rounds</span>
                            <span>•</span>
                            <span>Prize: {tournament.prize}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              tournament.status === "Active"
                                ? "bg-green-500 text-white"
                                : "bg-purple-500 text-white"
                            }`}
                          >
                            {tournament.status}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            Started {tournament.startTime}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mode Details */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700 sticky top-6">
              {selectedGameMode ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div
                      className={`w-16 h-16 bg-gradient-to-r ${selectedGameMode.color} rounded-lg flex items-center justify-center mx-auto mb-4`}
                    >
                      <selectedGameMode.icon className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                      {selectedGameMode.title}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedGameMode.description}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Button
                      variant="karaoke"
                      className="w-full py-3"
                      onClick={handleStartGame}
                    >
                      <Play className="mr-2 h-5 w-5" />
                      Start {selectedGameMode.title}
                    </Button>

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
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      What to Expect
                    </h3>
                    <ul className="space-y-2 text-sm">
                      {selectedGameMode.features.map((feature, index) => (
                        <li
                          key={index}
                          className="flex items-center text-gray-600 dark:text-gray-400"
                        >
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Estimated Time:</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {selectedGameMode.estimatedTime}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">Players:</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {selectedGameMode.players}
                      </span>
                    </div>
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

      {/* Sign In Prompt Modal */}
      {showSignInPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Mic className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                Sign In to Start Playing
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You need to sign in to start a karaoke battle. Create an account
                or sign in to continue.
              </p>

              <div className="space-y-3">
                <Button
                  variant="karaoke"
                  className="w-full"
                  onClick={handleSignIn}
                >
                  Sign In
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowSignInPrompt(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
