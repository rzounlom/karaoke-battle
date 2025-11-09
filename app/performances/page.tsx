"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BarChart3,
  Calendar,
  Crown,
  Heart,
  Music,
  Play,
  Sword,
  Target,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ProtectedRoute } from "@/components/protected-route";
import { formatScore } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";

interface ScoreResult {
  id: string;
  type: "score";
  song: {
    id: string;
    customId: string | null;
    title: string;
    artist: string;
    thumbnail: string | null;
    difficulty: string;
  };
  totalScore: number;
  accuracy: number;
  timing: number;
  pitch: number;
  lyrics: number;
  perfectNotes: number;
  currentStreak: number;
  maxStreak: number;
  gameMode: string;
  createdAt: string;
}

interface BattleResult {
  id: string;
  type: "battle";
  song: {
    id: string;
    customId: string | null;
    title: string;
    artist: string;
    thumbnail: string | null;
    difficulty: string;
  };
  status: string;
  isWinner: boolean;
  userRank: number;
  totalParticipants: number;
  userScore: number | null;
  winner: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  } | null;
  participants: Array<{
    id: string;
    user: {
      id: string;
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      avatar: string | null;
    };
    score: number | null;
    completedAt: string | null;
  }>;
  completedAt: string | null;
  createdAt: string;
}

type Result = ScoreResult | BattleResult;

export default function PerformancesPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [filter, setFilter] = useState<"all" | "scores" | "battles">("all");

  const loadResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const typeParam = filter === "all" ? "" : filter;
      const response = await fetch(
        `/api/user/performances?type=${typeParam}&limit=50`
      );
      const data = await response.json();

      if (data.success) {
        setResults(data.results || []);
      }
    } catch (error) {
      console.error("Error loading performances:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadResults();
    } else if (isLoaded && !isSignedIn) {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn, loadResults]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedResult(null);
    }
  };

  const handleCloseModal = useCallback(() => {
    setSelectedResult(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedResult) {
        handleCloseModal();
      }
    };

    if (selectedResult) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [selectedResult, handleCloseModal]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "EASY":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "HARD":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const filteredResults = results;

  if (!isLoaded) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
          <PageHeader title="Performances" showNavigation={true} />
          <div className="container mx-auto px-6 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!isSignedIn) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
          <PageHeader title="Performances" showNavigation={true} />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <PageHeader title="Performances" showNavigation={true} />

        <div className="container mx-auto px-6 py-8">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold karaoke-text-gradient mb-2">
              Performance History
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              View your past performances and battle results
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="mb-6 flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              size="sm"
            >
              All
            </Button>
            <Button
              variant={filter === "scores" ? "default" : "outline"}
              onClick={() => setFilter("scores")}
              size="sm"
            >
              <Music className="h-4 w-4 mr-2" />
              Scores
            </Button>
            <Button
              variant={filter === "battles" ? "default" : "outline"}
              onClick={() => setFilter("battles")}
              size="sm"
            >
              <Sword className="h-4 w-4 mr-2" />
              Battles
            </Button>
          </div>

          {/* Performances List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">
                Loading performances...
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Performances Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Start playing to see your performance history here!
                </p>
                <Link href="/songs">
                  <Button variant="karaoke">
                    <Play className="mr-2 h-4 w-4" />
                    Start Playing
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredResults.map((result) => (
                <Card
                  key={result.id}
                  className="hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => setSelectedResult(result)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {result.song.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {result.song.artist}
                        </p>
                      </div>
                      {result.type === "battle" && (
                        <Badge
                          variant="outline"
                          className={`ml-2 ${
                            result.isWinner
                              ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                              : "bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400"
                          }`}
                        >
                          {result.isWinner ? (
                            <Crown className="h-3 w-3 mr-1" />
                          ) : (
                            <Sword className="h-3 w-3 mr-1" />
                          )}
                          {result.isWinner ? "Won" : "Battle"}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-2xl font-bold karaoke-text-gradient">
                          {formatScore(
                            result.type === "score"
                              ? result.totalScore
                              : result.userScore || 0
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {result.type === "score" ? "Score" : "Your Score"}
                        </div>
                      </div>
                      {result.type === "battle" && result.userRank > 0 && (
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            #{result.userRank}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            of {result.totalParticipants}
                          </div>
                        </div>
                      )}
                    </div>

                    {result.type === "score" && (
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-xs">
                          <div className="text-gray-500 dark:text-gray-400">
                            Accuracy
                          </div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {Math.round(result.accuracy)}%
                          </div>
                        </div>
                        <div className="text-xs">
                          <div className="text-gray-500 dark:text-gray-400">
                            Streak
                          </div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {result.maxStreak}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(result.createdAt)}
                        </div>
                        <Badge
                          variant="outline"
                          className={getDifficultyColor(result.song.difficulty)}
                        >
                          {result.song.difficulty}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedResult && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"
            onClick={handleBackdropClick}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedResult.type === "score" ? (
                <ScoreDetailModal
                  result={selectedResult}
                  onClose={handleCloseModal}
                />
              ) : (
                <BattleDetailModal
                  result={selectedResult}
                  onClose={handleCloseModal}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function ScoreDetailModal({
  result,
  onClose,
}: {
  result: ScoreResult;
  onClose: () => void;
}) {
  const breakdown = [
    {
      category: "Lyrics Accuracy",
      score: Math.round(result.lyrics),
      maxScore: 100,
      color: "from-green-500 to-emerald-500",
      icon: Target,
    },
    {
      category: "Timing Accuracy",
      score: Math.round(result.timing),
      maxScore: 100,
      color: "from-blue-500 to-cyan-500",
      icon: Zap,
    },
    {
      category: "Pitch Accuracy",
      score: Math.round(result.pitch),
      maxScore: 100,
      color: "from-purple-500 to-pink-500",
      icon: Heart,
    },
    {
      category: "Overall Accuracy",
      score: Math.round(result.accuracy),
      maxScore: 100,
      color: "from-yellow-500 to-orange-500",
      icon: BarChart3,
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {result.song.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {result.song.artist}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Score Display */}
      <div className="text-center mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
        <div className="text-5xl font-bold karaoke-text-gradient mb-2">
          {formatScore(result.totalScore)}
        </div>
        <div className="text-lg text-gray-600 dark:text-gray-400">
          Total Score
        </div>
      </div>

      {/* Performance Breakdown */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
          <BarChart3 className="mr-2 h-5 w-5" />
          Performance Breakdown
        </h3>
        <div className="space-y-4">
          {breakdown.map((item, index) => (
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
                  style={{ width: `${(item.score / item.maxScore) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {result.perfectNotes}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Perfect Notes
          </div>
        </div>
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {result.maxStreak}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Max Streak
          </div>
        </div>
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {result.gameMode.replace("_", " ")}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Mode</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href={`/gameplay?songId=${result.song.customId || result.song.id}`}
          className="flex-1"
        >
          <Button variant="karaoke" className="w-full">
            <Play className="mr-2 h-4 w-4" />
            Play Again
          </Button>
        </Link>
        <Button variant="outline" onClick={onClose} className="flex-1">
          Close
        </Button>
      </div>
    </div>
  );
}

function BattleDetailModal({
  result,
  onClose,
}: {
  result: BattleResult;
  onClose: () => void;
}) {
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

  const sortedParticipants = [...result.participants].sort(
    (a, b) => (b.score || 0) - (a.score || 0)
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {result.song.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {result.song.artist}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Battle Status */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold karaoke-text-gradient mb-1">
              {result.userScore ? formatScore(result.userScore) : "No Score"}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Your Score
            </div>
          </div>
          <div className="text-right">
            {result.isWinner ? (
              <div className="flex items-center space-x-2">
                <Crown className="h-6 w-6 text-yellow-500" />
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    Winner!
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Rank #{result.userRank}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  Rank #{result.userRank}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  of {result.totalParticipants}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Participants Leaderboard */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
          <Users className="mr-2 h-5 w-5" />
          Battle Results
        </h3>
        <div className="space-y-2">
          {sortedParticipants.map((participant, index) => {
            const rank = index + 1;
            const displayName =
              participant.user.username ||
              `${participant.user.firstName || ""} ${
                participant.user.lastName || ""
              }`.trim() ||
              "Unknown";
            return (
              <div
                key={participant.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  rank === result.userRank
                    ? "bg-purple-500/10 border border-purple-300 dark:border-purple-700"
                    : "bg-gray-50 dark:bg-gray-700/50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${getRankColor(
                      rank
                    )}`}
                  >
                    {rank}
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={participant.user.avatar || undefined} />
                    <AvatarFallback>
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {displayName}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {participant.score ? formatScore(participant.score) : "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href={`/gameplay?songId=${result.song.customId || result.song.id}`}
          className="flex-1"
        >
          <Button variant="karaoke" className="w-full">
            <Play className="mr-2 h-4 w-4" />
            Play Again
          </Button>
        </Link>
        <Button variant="outline" onClick={onClose} className="flex-1">
          Close
        </Button>
      </div>
    </div>
  );
}
