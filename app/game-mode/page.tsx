"use client";

import {
  ArrowLeft,
  Clock,
  Mic,
  Play,
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
    description: "Solo performance - earn points and level up your skills",
    icon: Mic,
    features: [
      "Solo performance",
      "Earn experience points",
      "Level up your skills",
      "Track your progress",
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

export default function GameModePage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  const handleModeSelect = (modeId: string) => {
    if (!isLoaded) return; // Still loading auth state

    if (!isSignedIn) {
      setShowSignInPrompt(true);
      // Store the selected game mode for after sign-in
      sessionStorage.setItem("selectedGameMode", modeId);
      return;
    }

    // User is signed in, navigate to songs page with game mode
    router.push(`/songs?mode=${modeId}`);
  };

  const handleSignIn = () => {
    // Close the modal and redirect to sign-in with return URL
    setShowSignInPrompt(false);
    const selectedMode = sessionStorage.getItem("selectedGameMode") || "single";
    const returnUrl = encodeURIComponent(`/songs?mode=${selectedMode}`);
    router.push(`/sign-in?redirect_url=${returnUrl}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <Link href="/">
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
        <div className="space-y-8">
          {/* Game Modes */}
          <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
            {gameModes.map((mode) => (
              <div
                key={mode.id}
                onClick={() => handleModeSelect(mode.id)}
                className={`${mode.bgColor} rounded-2xl p-8 border-2 cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] border-gray-200 dark:border-gray-700 hover:border-purple-300`}
              >
                <div className="text-center mb-6">
                  <div
                    className={`w-20 h-20 bg-gradient-to-r ${mode.color} rounded-2xl flex items-center justify-center mx-auto mb-6`}
                  >
                    <mode.icon className="h-10 w-10 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                    {mode.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg">
                    {mode.description}
                  </p>

                  <div className="flex items-center justify-center space-x-6 mb-6 text-sm">
                    <div className="flex items-center space-x-2 text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{mode.estimatedTime}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-500">
                      <UsersIcon className="h-4 w-4" />
                      <span className="font-medium">{mode.players}</span>
                    </div>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {mode.features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-center text-gray-600 dark:text-gray-400"
                    >
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="text-center">
                  <Button
                    variant="karaoke"
                    size="lg"
                    className="w-full py-3 text-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleModeSelect(mode.id);
                    }}
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Start {mode.title}
                  </Button>
                </div>
              </div>
            ))}
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
