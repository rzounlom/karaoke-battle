"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, Sword, Trophy, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// import { formatTime } from "@/lib/utils";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { useChallengeNotifications } from "@/hooks/use-challenge-notifications";
import { toast } from "@/lib/toast";

interface Battle {
  id: string;
  challenger: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
    level: number;
  };
  song: {
    id: string;
    customId: string;
    title: string;
    artist: string;
    thumbnail: string | null;
  };
  status: string;
  winner: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  } | null;
  expiresAt: string | null;
  completedAt: string | null;
  createdAt: string;
  participants: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      avatar: string | null;
      level: number;
    };
    status: string;
    score: number | null;
    completedAt: string | null;
  }>;
}

export default function BattlesPage() {
  const [battles, setBattles] = useState<{
    pendingReceived: Battle[];
    pendingSent: Battle[];
    active: Battle[];
    completed: Battle[];
    declined: Battle[];
    expired: Battle[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingChallengeId, setAcceptingChallengeId] = useState<string | null>(null);
  
  const { 
    loadNotifications: loadChallengeNotifications,
    removeNotification: removeChallengeNotification 
  } = useChallengeNotifications();

  useEffect(() => {
    loadBattles();
  }, []);

  const loadBattles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/challenges");
      const data = await response.json();

      if (data.success) {
        setBattles({
          pendingReceived: data.pendingReceived || [],
          pendingSent: data.pendingSent || [],
          active: data.active || [],
          completed: data.completed || [],
          declined: data.declined || [],
          expired: data.expired || [],
        });
      }
    } catch (error) {
      console.error("Error loading battles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptChallenge = async (challengeId: string) => {
    setAcceptingChallengeId(challengeId);
    try {
      const response = await fetch(`/api/challenges/${challengeId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Challenge accepted!", data.message);
        // Immediately remove from notifications UI
        removeChallengeNotification(challengeId);
        // Reload battles to update the UI (challenge will move to active tab)
        await loadBattles();
        // Refresh notifications to ensure consistency
        loadChallengeNotifications();
      } else {
        toast.error(data.message || "Failed to accept challenge");
      }
    } catch (error) {
      console.error("Error accepting challenge:", error);
      toast.error("Failed to accept challenge");
    } finally {
      setAcceptingChallengeId(null);
    }
  };

  const handleDeclineChallenge = async (challengeId: string) => {
    try {
      const response = await fetch(`/api/challenges/${challengeId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Challenge declined");
        // Immediately remove from notifications UI
        removeChallengeNotification(challengeId);
        // Reload battles to update the UI
        await loadBattles();
        // Refresh notifications to ensure consistency
        loadChallengeNotifications();
      } else {
        toast.error(data.message || "Failed to decline challenge");
      }
    } catch (error) {
      console.error("Error declining challenge:", error);
      toast.error("Failed to decline challenge");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "ACCEPTED":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
          >
            Accepted
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
          >
            In Progress
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "DECLINED":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Declined
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400"
          >
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getParticipantNames = (battle: Battle) => {
    return battle.participants
      .map(
        (p) =>
          p.user.username ||
          `${p.user.firstName || ""} ${p.user.lastName || ""}`.trim() ||
          "Unknown"
      )
      .join(", ");
  };

  const renderBattleCard = (
    battle: Battle,
    showActions: boolean = false,
    isPendingReceived: boolean = false
  ) => {
    const participantNames = getParticipantNames(battle);
    const hasScores = battle.participants.some((p) => p.score !== null);
    const isAccepting = acceptingChallengeId === battle.id;

    return (
      <Card key={battle.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Avatar className="h-10 w-10">
                <AvatarImage src={battle.challenger.avatar || undefined} />
                <AvatarFallback>
                  {battle.challenger.username?.charAt(0) ||
                    battle.challenger.firstName?.charAt(0) ||
                    "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {battle.song.title}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {battle.song.artist}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Participants: {participantNames}
                </p>
              </div>
            </div>
            {getStatusBadge(battle.status)}
          </div>

          {hasScores && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-2">
                {battle.participants.map((participant) => (
                  <div key={participant.id} className="text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {participant.user.username ||
                        `${participant.user.firstName || ""} ${
                          participant.user.lastName || ""
                        }`.trim()}
                      :
                    </span>{" "}
                    <span className="text-gray-600 dark:text-gray-400">
                      {participant.score !== null
                        ? participant.score.toLocaleString()
                        : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {battle.winner && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2 text-sm">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="font-medium text-gray-900 dark:text-white">
                  Winner:{" "}
                  {battle.winner.username ||
                    `${battle.winner.firstName || ""} ${
                      battle.winner.lastName || ""
                    }`.trim()}
                </span>
              </div>
            </div>
          )}

          {/* Accept/Decline buttons for pending received challenges */}
          {isPendingReceived && battle.status === "PENDING" && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAcceptChallenge(battle.id)}
                  disabled={isAccepting}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isAccepting ? "Accepting..." : "Accept"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeclineChallenge(battle.id)}
                  disabled={isAccepting}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </div>
            </div>
          )}

          {/* Play Battle button for accepted challenges */}
          {showActions && (battle.status === "ACCEPTED" || battle.status === "IN_PROGRESS") && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <Link
                href={`/gameplay?songId=${
                  battle.song.customId || battle.song.id
                }&battleId=${battle.id}`}
              >
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Sword className="h-4 w-4 mr-2" />
                  Play Battle
                </Button>
              </Link>
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {new Date(battle.createdAt).toLocaleDateString()} •{" "}
            {new Date(battle.createdAt).toLocaleTimeString()}
          </p>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <PageHeader title="Battles" showNavigation={true} />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading battles...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      <PageHeader title="Battles" showNavigation={true} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Battles
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            View all your karaoke battles - active, pending, and completed.
          </p>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Sword className="h-4 w-4" />
              Active ({battles?.active.length || 0})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending (
              {(battles?.pendingReceived.length || 0) +
                (battles?.pendingSent.length || 0)}
              )
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Completed ({battles?.completed.length || 0})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {battles?.active.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Sword className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No Active Battles
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    You don&apos;t have any active battles right now.
                  </p>
                  <Link href="/songs">
                    <Button variant="karaoke">
                      <Sword className="h-4 w-4 mr-2" />
                      Start a Battle
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {battles?.active.map((battle) =>
                  renderBattleCard(battle, true)
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <div className="space-y-6">
              {battles && battles.pendingReceived.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Received ({battles.pendingReceived.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {battles.pendingReceived.map((battle) =>
                      renderBattleCard(battle, false, true)
                    )}
                  </div>
                </div>
              )}
              {battles && battles.pendingSent.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Sent ({battles.pendingSent.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {battles.pendingSent.map((battle) =>
                      renderBattleCard(battle)
                    )}
                  </div>
                </div>
              )}
              {!battles?.pendingReceived?.length &&
                !battles?.pendingSent?.length && (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No Pending Battles
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        You don&apos;t have any pending battle requests.
                      </p>
                    </CardContent>
                  </Card>
                )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {battles?.completed.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No Completed Battles
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Complete battles to see results here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {battles?.completed.map((battle) => renderBattleCard(battle))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="space-y-6">
              {(battles?.declined.length || 0) > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Declined ({battles?.declined.length || 0})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {battles?.declined.map((battle) =>
                      renderBattleCard(battle)
                    )}
                  </div>
                </div>
              )}
              {(battles?.expired.length || 0) > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Expired ({battles?.expired.length || 0})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {battles?.expired.map((battle) => renderBattleCard(battle))}
                  </div>
                </div>
              )}
              {!battles?.declined.length && !battles?.expired.length && (
                <Card>
                  <CardContent className="text-center py-8">
                    <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No History
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      No declined or expired battles.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
