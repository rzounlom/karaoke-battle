"use client";

import { Trophy, Users, Award, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface ChallengeParticipant {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
    level: number;
  };
  status: string;
  score: number | null;
  completedAt: string | null;
}

interface ChallengeResultsProps {
  challenge: {
    id: string;
    status: string;
    winner: {
      id: string;
      username: string;
      firstName: string | null;
      lastName: string | null;
      avatar: string | null;
    } | null;
    participants: ChallengeParticipant[];
  };
  currentUserId: string;
  currentUserScore: number;
  onViewDetails?: () => void;
}

export function ChallengeResults({
  challenge,
  currentUserId,
  currentUserScore,
  onViewDetails,
}: ChallengeResultsProps) {
  // Sort participants by score (highest first)
  const sortedParticipants = [...challenge.participants]
    .filter((p) => p.status === "ACCEPTED" && p.score !== null)
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  // Find current user's position
  const currentUserRank =
    sortedParticipants.findIndex((p) => p.userId === currentUserId) + 1;

  // Check if current user won
  const currentUserWon = challenge.winner?.id === currentUserId;

  // Get all participants (including those who haven't completed)
  const allParticipants = challenge.participants.filter(
    (p) => p.status === "ACCEPTED"
  );

  // Exclude current user from pending participants (they just completed)
  const pendingParticipants = allParticipants.filter(
    (p) =>
      p.userId !== currentUserId && (p.score === null || p.completedAt === null)
  );

  const completedParticipants = allParticipants.filter(
    (p) => p.score !== null && p.completedAt !== null
  );

  // Determine result status
  const resultStatus =
    challenge.status === "COMPLETED"
      ? currentUserWon
        ? "won"
        : "lost"
      : pendingParticipants.length > 0
      ? "pending"
      : "completed";

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <h2 className="text-2xl font-bold">Battle Results</h2>
        </div>
        {resultStatus === "won" && (
          <Badge className="bg-yellow-500 text-white" variant="default">
            <Award className="h-4 w-4 mr-1" />
            Winner!
          </Badge>
        )}
      </div>

      {/* Your Score */}
      <div className="bg-muted rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Your Score</p>
            <p className="text-3xl font-bold">
              {currentUserScore.toLocaleString()}
            </p>
          </div>
          {resultStatus === "won" && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Rank</p>
              <p className="text-2xl font-bold text-yellow-500">#1</p>
            </div>
          )}
          {resultStatus === "lost" && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Rank</p>
              <p className="text-2xl font-bold">#{currentUserRank}</p>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      {completedParticipants.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Battle Leaderboard
          </h3>
          <div className="space-y-2">
            {sortedParticipants.map((participant, index) => {
              const isCurrentUser = participant.userId === currentUserId;
              const isWinner = index === 0;

              return (
                <div
                  key={participant.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isCurrentUser
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-muted/50"
                  } ${isWinner ? "ring-2 ring-yellow-500" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background font-bold">
                      {isWinner ? (
                        <Trophy className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <span>#{index + 1}</span>
                      )}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={participant.user.avatar || undefined}
                        alt={participant.user.username}
                      />
                      <AvatarFallback>
                        {participant.user.firstName?.[0] ||
                          participant.user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {participant.user.firstName ||
                          participant.user.username}
                        {isCurrentUser && " (You)"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Level {participant.user.level}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {participant.score?.toLocaleString()}
                    </p>
                    {participant.completedAt && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(participant.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Participants */}
      {pendingParticipants.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <p className="font-medium text-blue-700 dark:text-blue-400">
              Waiting for {pendingParticipants.length} opponent
              {pendingParticipants.length > 1 ? "s" : ""} to complete...
            </p>
          </div>
          <div className="space-y-1 mt-2">
            {pendingParticipants.map((participant) => (
              <p
                key={participant.id}
                className="text-sm text-blue-600 dark:text-blue-300"
              >
                •{" "}
                {participant.user.username ||
                  `${participant.user.firstName || ""} ${
                    participant.user.lastName || ""
                  }`.trim() ||
                  "Unknown User"}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Result Status Messages */}
      {resultStatus === "won" && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="font-medium text-yellow-700 dark:text-yellow-400">
            🎉 Congratulations! You won this battle! You&apos;ve earned 15,000
            points per opponent you beat!
          </p>
        </div>
      )}

      {resultStatus === "lost" && (
        <div className="bg-muted rounded-lg p-4">
          <p className="font-medium">
            Good effort! Keep practicing to improve your score.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onViewDetails && (
          <Button onClick={onViewDetails} variant="outline" className="flex-1">
            View Battle Details
          </Button>
        )}
        <Link href="/battles" className="flex-1">
          <Button variant="default" className="w-full">
            Go to Battles
          </Button>
        </Link>
      </div>
    </Card>
  );
}
