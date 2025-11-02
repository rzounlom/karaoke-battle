"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Trophy, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";

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

interface ChallengeContextProps {
  challenge: {
    id: string;
    status: string;
    expiresAt: string | null;
    participants: ChallengeParticipant[];
  };
  currentUserId: string;
}

export function ChallengeContext({
  challenge,
  currentUserId,
}: ChallengeContextProps) {
  // Get other participants (opponents)
  const opponents = challenge.participants.filter(
    (p) => p.userId !== currentUserId && p.status === "ACCEPTED"
  );

  // Calculate time remaining
  const timeRemaining = challenge.expiresAt
    ? Math.max(0, new Date(challenge.expiresAt).getTime() - Date.now())
    : null;

  const hoursRemaining = timeRemaining
    ? Math.floor(timeRemaining / (1000 * 60 * 60))
    : null;
  const minutesRemaining = timeRemaining
    ? Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
    : null;

  // Check if any opponent has completed
  const hasOpponentCompleted = opponents.some(
    (p) => p.score !== null && p.completedAt !== null
  );

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h3 className="font-semibold text-lg">Battle Mode</h3>
      </div>

      {/* Opponents */}
      {opponents.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Opponents:
            </span>
          </div>
          <div className="space-y-2">
            {opponents.map((opponent) => (
              <div
                key={opponent.id}
                className="flex items-center justify-between gap-3 p-2 rounded-md bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={opponent.user.avatar || undefined}
                      alt={opponent.user.username}
                    />
                    <AvatarFallback>
                      {opponent.user.firstName?.[0] ||
                        opponent.user.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {opponent.user.firstName || opponent.user.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Level {opponent.user.level}
                    </p>
                  </div>
                </div>
                {opponent.score !== null ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-semibold">
                      {opponent.score.toLocaleString()}
                    </Badge>
                    {opponent.score !== null && (
                      <Trophy className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                ) : (
                  <Badge variant="outline">In Progress</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Remaining */}
      {timeRemaining !== null && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Time Remaining:</span>
          <span className="text-sm font-semibold">
            {hoursRemaining !== null && minutesRemaining !== null
              ? `${hoursRemaining}h ${minutesRemaining}m`
              : "Expired"}
          </span>
        </div>
      )}

      {/* Motivational Message */}
      {hasOpponentCompleted && (
        <div className="mt-3 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
            💪 Opponent has completed! Beat their score!
          </p>
        </div>
      )}

      {!hasOpponentCompleted && opponents.length > 0 && (
        <div className="mt-3 p-2 rounded-md bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
            🎯 Be the first to set the score!
          </p>
        </div>
      )}
    </div>
  );
}
