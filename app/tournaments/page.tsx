"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Loader2, Trophy, Users, Clock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ProtectedRoute } from "@/components/protected-route";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/lib/toast";

interface Tournament {
  id: string;
  sessionCode: string;
  name: string | null;
  status: string;
  maxPlayers: number;
  currentPlayers: number;
  host: {
    id: string;
    displayName: string;
    avatar: string | null;
  };
  participants: Array<{
    id: string;
    displayName: string;
    turnOrder: number;
    isReady: boolean;
    hasAccount: boolean;
    user: {
      id: string;
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      avatar: string | null;
    } | null;
  }>;
  createdAt: string;
  startedAt: string | null;
  expiresAt: string | null;
}

export default function TournamentsPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [hostedTournaments, setHostedTournaments] = useState<Tournament[]>([]);
  const [joinedTournaments, setJoinedTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadTournaments();
    }
  }, [isLoaded, isSignedIn]);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tournament/my-tournaments");
      const data = await response.json();

      if (data.success) {
        setHostedTournaments(data.hosted || []);
        setJoinedTournaments(data.joined || []);
      } else {
        toast.error(data.message || "Failed to load tournaments");
      }
    } catch (error) {
      console.error("Error loading tournaments:", error);
      toast.error("Failed to load tournaments", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isExpired = (tournament: Tournament) => {
    if (!tournament.expiresAt) return false;
    return new Date(tournament.expiresAt) < new Date();
  };

  const getStatusColor = (status: string, expired: boolean) => {
    if (expired) {
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
    }
    switch (status) {
      case "WAITING":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
      case "STARTING":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
      case "IN_PROGRESS":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusLabel = (status: string, expired: boolean) => {
    if (expired) {
      return "Expired";
    }
    switch (status) {
      case "WAITING":
        return "Waiting";
      case "STARTING":
        return "Starting";
      case "IN_PROGRESS":
        return "In Progress";
      default:
        return status;
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <PageHeader title="My Tournaments" />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600 dark:text-gray-400">
              Loading tournaments...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <PageHeader title="My Tournaments" />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {loading ? (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
              <p className="text-gray-600 dark:text-gray-400">
                Loading tournaments...
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Hosted Tournaments */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Tournaments I Created
                </h2>
                {hostedTournaments.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400">
                      You haven&apos;t created any tournaments yet.
                    </p>
                    <Button
                      onClick={() => router.push("/songs")}
                      className="mt-4"
                    >
                      Create Tournament
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {hostedTournaments.map((tournament) => {
                      const expired = isExpired(tournament);
                      return (
                        <div
                          key={tournament.id}
                          className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-shadow ${
                            expired
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:shadow-xl cursor-pointer"
                          }`}
                          onClick={() => {
                            if (!expired) {
                              router.push(
                                `/tournament/lobby/${tournament.sessionCode}`
                              );
                            }
                          }}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {tournament.name || "Tournament"}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                                {tournament.sessionCode}
                              </p>
                            </div>
                            <span
                              className={`text-xs px-2 py-1 rounded ${getStatusColor(
                                tournament.status,
                                expired
                              )}`}
                            >
                              {getStatusLabel(tournament.status, expired)}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>
                                {tournament.currentPlayers} / {tournament.maxPlayers} players
                              </span>
                            </div>
                            {tournament.startedAt && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>
                                  Started{" "}
                                  {new Date(tournament.startedAt).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {expired && tournament.expiresAt && (
                              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <Clock className="h-4 w-4" />
                                <span>
                                  Expired{" "}
                                  {new Date(tournament.expiresAt).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                          {expired ? (
                            <Button
                              className="w-full mt-4"
                              variant="outline"
                              disabled
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Expired
                            </Button>
                          ) : (
                            <Button
                              className="w-full mt-4"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/tournament/lobby/${tournament.sessionCode}`
                                );
                              }}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Open Lobby
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Joined Tournaments */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Tournaments I Joined
                </h2>
                {joinedTournaments.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400">
                      You haven&apos;t joined any tournaments yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {joinedTournaments.map((tournament) => {
                      const expired = isExpired(tournament);
                      return (
                        <div
                          key={tournament.id}
                          className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-shadow ${
                            expired
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:shadow-xl cursor-pointer"
                          }`}
                          onClick={() => {
                            if (!expired) {
                              router.push(
                                `/tournament/lobby/${tournament.sessionCode}`
                              );
                            }
                          }}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {tournament.name || "Tournament"}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                                {tournament.sessionCode}
                              </p>
                            </div>
                            <span
                              className={`text-xs px-2 py-1 rounded ${getStatusColor(
                                tournament.status,
                                expired
                              )}`}
                            >
                              {getStatusLabel(tournament.status, expired)}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>
                                {tournament.currentPlayers} / {tournament.maxPlayers} players
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Trophy className="h-4 w-4" />
                              <span>Host: {tournament.host.displayName}</span>
                            </div>
                            {expired && tournament.expiresAt && (
                              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <Clock className="h-4 w-4" />
                                <span>
                                  Expired{" "}
                                  {new Date(tournament.expiresAt).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                          {expired ? (
                            <Button
                              className="w-full"
                              variant="outline"
                              disabled
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Expired
                            </Button>
                          ) : (
                            <Button
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/tournament/lobby/${tournament.sessionCode}`
                                );
                              }}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Open Lobby
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

