"use client";

import {
  ArrowLeft,
  BarChart3,
  Crown,
  Heart,
  Home,
  Play,
  Share,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ProtectedRoute } from "@/components/protected-route";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfile } from "@/components/user-profile";
import { formatScore } from "@/lib/utils";
import { useState } from "react";

export default function ResultsPage() {
  const [showDetails, setShowDetails] = useState(false);

  // Mock performance data
  const performance = {
    totalScore: 8450,
    accuracy: 92,
    timing: 88,
    pitch: 85,
    lyrics: 95,
    perfectNotes: 45,
    currentStreak: 12,
    maxStreak: 18,
    rank: 1,
    totalPlayers: 8,
    achievements: [
      {
        name: "Perfect Timing",
        icon: "🎯",
        description: "Hit 10 notes in perfect timing",
        rarity: "Rare",
      },
      {
        name: "Word Master",
        icon: "📝",
        description: "95% lyrics accuracy",
        rarity: "Common",
      },
      {
        name: "Streak Master",
        icon: "🔥",
        description: "18 note streak",
        rarity: "Epic",
      },
    ],
    breakdown: [
      {
        category: "Lyrics Accuracy",
        score: 95,
        maxScore: 100,
        color: "from-green-500 to-emerald-500",
        icon: Target,
      },
      {
        category: "Timing Accuracy",
        score: 88,
        maxScore: 100,
        color: "from-blue-500 to-cyan-500",
        icon: Zap,
      },
      {
        category: "Pitch Accuracy",
        score: 85,
        maxScore: 100,
        color: "from-purple-500 to-pink-500",
        icon: Heart,
      },
      {
        category: "Rhythm",
        score: 90,
        maxScore: 100,
        color: "from-yellow-500 to-orange-500",
        icon: TrendingUp,
      },
    ],
  };

  const multiplayerResults = [
    { name: "You", score: 8450, rank: 1, isCurrent: true, avatar: "Y" },
    { name: "John", score: 7200, rank: 2, isCurrent: false, avatar: "J" },
    { name: "Sarah", score: 6800, rank: 3, isCurrent: false, avatar: "S" },
    { name: "Mike", score: 6200, rank: 4, isCurrent: false, avatar: "M" },
  ];

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500";
      case 2:
        return "bg-gray-400";
      case 3:
        return "bg-orange-600";
      default:
        return "bg-gray-500";
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "Epic":
        return "text-purple-600 bg-purple-100 dark:bg-purple-900/30";
      case "Rare":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
      default:
        return "text-green-600 bg-green-100 dark:bg-green-900/30";
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        {/* Header */}
        <header className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Link href="/gameplay">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold karaoke-text-gradient">
              Performance Results
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <UserProfile />
            <ThemeToggle />
          </div>
        </header>

        <div className="container mx-auto px-6 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Score Card */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
                    Bohemian Rhapsody
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">Queen</p>
                </div>

                <div className="mb-8">
                  <div className="text-6xl font-bold karaoke-text-gradient mb-2">
                    {formatScore(performance.totalScore)}
                  </div>
                  <div className="text-lg text-gray-600 dark:text-gray-400">
                    Total Score
                  </div>
                </div>

                {/* Rank Badge */}
                <div className="mb-6">
                  <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full">
                    <Crown className="h-5 w-5" />
                    <span className="font-semibold">
                      #{performance.rank} of {performance.totalPlayers} Players
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {performance.accuracy}%
                    </div>
                    <div className="text-sm text-gray-500">Accuracy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {performance.timing}%
                    </div>
                    <div className="text-sm text-gray-500">Timing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {performance.pitch}%
                    </div>
                    <div className="text-sm text-gray-500">Pitch</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {performance.lyrics}%
                    </div>
                    <div className="text-sm text-gray-500">Lyrics</div>
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  <Link href="/songs">
                    <Button variant="karaoke" className="px-8">
                      <Play className="mr-2 h-4 w-4" />
                      Play Again
                    </Button>
                  </Link>
                  <Button variant="outline">
                    <Share className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Performance Breakdown */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold flex items-center text-gray-900 dark:text-white">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Performance Breakdown
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    {showDetails ? "Hide Details" : "Show Details"}
                  </Button>
                </div>

                <div className="space-y-4">
                  {performance.breakdown.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center text-gray-700 dark:text-gray-300">
                          <item.icon className="h-4 w-4 mr-2" />
                          {item.category}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {item.score}/{item.maxScore}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`bg-gradient-to-r ${item.color} h-2 rounded-full transition-all duration-500`}
                          style={{
                            width: `${(item.score / item.maxScore) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>

                {showDetails && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Perfect Notes
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {performance.perfectNotes}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Current Streak
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {performance.currentStreak}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Max Streak
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {performance.maxStreak}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Bonus Points
                          </span>
                          <span className="font-medium text-green-600">
                            +200
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Achievements */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold mb-6 flex items-center text-gray-900 dark:text-white">
                  <Trophy className="mr-2 h-5 w-5" />
                  Achievements Unlocked
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {performance.achievements.map((achievement, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-3xl">{achievement.icon}</div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getRarityColor(
                            achievement.rarity
                          )}`}
                        >
                          {achievement.rarity}
                        </span>
                      </div>
                      <h4 className="font-semibold mb-1 text-gray-900 dark:text-white">
                        {achievement.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {achievement.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Multiplayer Results */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
                  <Users className="mr-2 h-4 w-4" />
                  Battle Results
                </h3>
                <div className="space-y-3">
                  {multiplayerResults.map((player, index) => (
                    <div
                      key={player.name}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                        player.isCurrent
                          ? "bg-purple-500/10 border border-purple-300 shadow-lg"
                          : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${getRankColor(
                            player.rank
                          )}`}
                        >
                          {player.rank}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {player.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatScore(player.score)} pts
                          </div>
                        </div>
                      </div>
                      {player.isCurrent && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Next Steps
                </h3>
                <div className="space-y-3">
                  <Link href="/songs">
                    <Button variant="karaoke" className="w-full">
                      <Play className="mr-2 h-4 w-4" />
                      Try Another Song
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full">
                    <Trophy className="mr-2 h-4 w-4" />
                    View Leaderboard
                  </Button>
                  <Link href="/">
                    <Button variant="outline" className="w-full">
                      <Home className="mr-2 h-4 w-4" />
                      Back to Home
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Performance Tips */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Performance Tips
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2"></div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Practice timing with the beat to improve your rhythm score
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2"></div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Focus on pronunciation for better lyrics accuracy
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2"></div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Try different songs to improve your pitch recognition
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
