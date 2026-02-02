import { prisma } from "@/lib/prisma";
import { TurnStatus, TournamentSessionStatus } from "@prisma/client";
import { publishTournamentEvent } from "@/lib/ably-server";

/**
 * Generate a random alphanumeric session code
 * @param length - Length of the code (default: 6)
 * @returns Random alphanumeric string
 */
function generateSessionCode(length: number = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a unique tournament session code
 * Checks database to ensure uniqueness
 * @param length - Length of the code (default: 6)
 * @param maxAttempts - Maximum attempts to generate unique code (default: 10)
 * @returns Unique session code
 */
export async function generateUniqueSessionCode(
  length: number = 6,
  maxAttempts: number = 10
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateSessionCode(length);
    
    // Check if code already exists
    const existing = await prisma.tournamentSession.findUnique({
      where: { sessionCode: code },
    });

    if (!existing) {
      return code;
    }
  }

  // If we couldn't generate a unique code, try with longer length
  if (length < 8) {
    return generateUniqueSessionCode(length + 1, maxAttempts);
  }

  throw new Error("Failed to generate unique session code");
}

/**
 * Create a shareable tournament join URL
 * @param sessionCode - The tournament session code
 * @returns Full URL for joining the tournament
 */
export function createTournamentJoinUrl(sessionCode: string): string {
  if (typeof window !== "undefined") {
    // Client-side: use current origin
    return `${window.location.origin}/tournament/join/${sessionCode}`;
  }
  // Server-side: use environment variable or default
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/tournament/join/${sessionCode}`;
}

/**
 * Move to the next turn in a tournament after a turn is completed or skipped
 * @param sessionId - The tournament session ID
 * @param sessionCode - The tournament session code (for broadcasting events)
 * @param currentTurnOrder - The turn order of the current/just-completed turn
 * @param skippedParticipantId - Optional: The participant ID if the current turn was skipped (for second chance logic)
 * @returns The next turn if created, or null if tournament is complete
 */
export async function moveToNextTurn(
  sessionId: string,
  sessionCode: string,
  currentTurnOrder: number,
  skippedParticipantId?: string
) {
  // Get session with participants
  const session = await prisma.tournamentSession.findUnique({
    where: { id: sessionId },
    include: {
      participants: {
        orderBy: { turnOrder: "asc" },
      },
    },
  });

  if (!session) {
    throw new Error("Tournament session not found");
  }

  // Get all turns to check completion status
  // Note: If skippedParticipantId is provided, the turn has already been marked as SKIPPED
  // in the database, so it will be included in this fetch
  const allTurns = await prisma.tournamentTurn.findMany({
    where: { sessionId },
    include: {
      participant: true,
    },
  });

  // Check if a participant has been skipped before (for second chance logic)
  // This counts ALL skipped turns for the participant, including the one just marked as SKIPPED
  const getSkipCount = (participantId: string): number => {
    return allTurns.filter(
      (t) => t.participantId === participantId && t.status === TurnStatus.SKIPPED
    ).length;
  };

  // Check if all participants have completed their turns
  // A turn is considered "completed" if it's COMPLETED or SKIPPED (with no second chance pending)
  const allParticipantsCompleted = session.participants.every((p) => {
    const participantTurns = allTurns.filter((t) => t.participantId === p.id);
    const hasCompletedTurn = participantTurns.some(
      (t) => t.status === TurnStatus.COMPLETED
    );
    const skipCount = getSkipCount(p.id);
    
    // Participant is done if:
    // 1. They have a COMPLETED turn, OR
    // 2. They have been skipped twice (no second chance)
    return hasCompletedTurn || skipCount >= 2;
  });

  if (allParticipantsCompleted) {
    // Tournament is complete
    await prisma.tournamentSession.update({
      where: { id: sessionId },
      data: {
        status: TournamentSessionStatus.COMPLETED,
      },
    });

    // Broadcast tournament completed event
    await publishTournamentEvent(sessionCode, "tournament_completed", {
      session: {
        id: session.id,
        sessionCode: session.sessionCode,
        status: TournamentSessionStatus.COMPLETED,
      },
    });

    return null;
  }

  // Handle second chance logic: If a participant was just skipped, check if they get a second chance
  let participantToAddToEnd: typeof session.participants[0] | null = null;
  if (skippedParticipantId) {
    const skipCount = getSkipCount(skippedParticipantId);
    if (skipCount === 1) {
      // First skip - they get a second chance at the end
      participantToAddToEnd = session.participants.find(
        (p) => p.id === skippedParticipantId
      ) || null;
    }
    // If skipCount >= 2, they've already had their second chance, so no more turns
  }

  // Find next participant who hasn't completed their turn
  // Priority: regular order first, then participants who were skipped once (at the end)
  let nextParticipant = session.participants.find((p) => {
    // Skip participants who have been skipped once (they go to the end)
    if (participantToAddToEnd && p.id === participantToAddToEnd.id) {
      return false;
    }
    
    // Skip participants who have been skipped twice (no more chances)
    if (getSkipCount(p.id) >= 2) {
      return false;
    }
    
    if (p.turnOrder <= currentTurnOrder) return false;
    
    const participantTurns = allTurns.filter((t) => t.participantId === p.id);
    const hasCompletedTurn = participantTurns.some(
      (t) => t.status === TurnStatus.COMPLETED
    );
    
    // Skip if they've completed a turn
    if (hasCompletedTurn) return false;
    
    // Skip if they've been skipped once already (they'll go to the end)
    if (getSkipCount(p.id) === 1) return false;
    
    return true;
  });

  // If no regular participant found, check if we need to add the skipped participant to the end
  if (!nextParticipant && participantToAddToEnd) {
    // Check if all other participants have completed (so we can add the skipped one to the end)
    const allOthersCompleted = session.participants
      .filter((p) => p.id !== participantToAddToEnd.id)
      .every((p) => {
        const participantTurns = allTurns.filter((t) => t.participantId === p.id);
        const hasCompletedTurn = participantTurns.some(
          (t) => t.status === TurnStatus.COMPLETED
        );
        const skipCount = getSkipCount(p.id);
        return hasCompletedTurn || skipCount >= 2;
      });

    if (allOthersCompleted) {
      // All others are done, so the skipped participant gets their second chance
      nextParticipant = participantToAddToEnd;
    }
  }

  if (!nextParticipant) {
    // No more participants - tournament is complete
    await prisma.tournamentSession.update({
      where: { id: sessionId },
      data: {
        status: TournamentSessionStatus.COMPLETED,
      },
    });

    await publishTournamentEvent(sessionCode, "tournament_completed", {
      session: {
        id: session.id,
        sessionCode: session.sessionCode,
        status: TournamentSessionStatus.COMPLETED,
      },
    });

    return null;
  }

  // Create next turn
  const songSelectionTimeLimit =
    (session.settings as { songSelectionTimeLimit?: number })
      ?.songSelectionTimeLimit || 60;

  const nextTurnExpiresAt = new Date();
  nextTurnExpiresAt.setSeconds(
    nextTurnExpiresAt.getSeconds() + songSelectionTimeLimit
  );

  const nextTurnNumber = allTurns.length + 1;

  const nextTurn = await prisma.tournamentTurn.create({
    data: {
      sessionId: session.id,
      participantId: nextParticipant.id,
      turnNumber: nextTurnNumber,
      status: TurnStatus.PENDING,
      expiresAt: nextTurnExpiresAt,
    },
    include: {
      participant: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      },
    },
  });

  // Broadcast next turn started event
  await publishTournamentEvent(sessionCode, "next_turn_started", {
    turn: {
      id: nextTurn.id,
      turnNumber: nextTurn.turnNumber,
      participant: {
        id: nextTurn.participant.id,
        displayName: nextTurn.participant.displayName,
        turnOrder: nextTurn.participant.turnOrder,
      },
      status: nextTurn.status,
      expiresAt: nextTurn.expiresAt,
    },
  });

  return nextTurn;
}

