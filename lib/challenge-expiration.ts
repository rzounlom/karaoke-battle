import { prisma } from "@/lib/prisma";
import { addExperience } from "@/lib/experience";

/**
 * Check and process expired challenges
 * This is called on:
 * - When loading the battles page (/api/challenges GET)
 * - When accepting a challenge (/api/challenges/[id]/accept POST)
 * - When submitting a score (/api/challenges/[id]/submit POST)
 * 
 * This ensures expired challenges are processed whenever users interact with challenges,
 * providing a consistent "best effort" approach without requiring external cron jobs.
 */
export async function processExpiredChallenges() {
  try {
    const now = new Date();
    let processed = 0;

    // 1. Handle PENDING challenges that expired (past acceptance deadline - 3 days)
    // These challenges were never accepted, so no points are awarded
    const expiredPendingChallenges = await prisma.challenge.findMany({
      where: {
        expiresAt: {
          lte: now,
        },
        status: "PENDING",
        winnerId: null,
      },
      include: {
        participants: true,
      },
    });

    for (const challenge of expiredPendingChallenges) {
      // Check if any participant accepted (shouldn't happen, but safety check)
      const hasAcceptedParticipants = challenge.participants.some(
        (p) => p.status === "ACCEPTED" && p.userId !== challenge.challengerId
      );

      if (!hasAcceptedParticipants) {
        // No one accepted - mark as expired with no winner
        await prisma.challenge.update({
          where: { id: challenge.id },
          data: {
            status: "EXPIRED",
            completedAt: now,
          },
        });
        processed++;
      }
    }

    // 2. Handle ACCEPTED/IN_PROGRESS challenges that expired (past completion deadline - 24 hours)
    // These challenges were accepted, so determine winner based on scores
    const expiredActiveChallenges = await prisma.challenge.findMany({
      where: {
        expiresAt: {
          lte: now,
        },
        status: {
          in: ["ACCEPTED", "IN_PROGRESS"],
        },
        winnerId: null,
      },
      include: {
        participants: {
          where: {
            status: "ACCEPTED",
          },
          include: {
            user: true,
          },
        },
      },
    });

    if (expiredActiveChallenges.length === 0 && expiredPendingChallenges.length === 0) {
      return { processed };
    }

    for (const challenge of expiredActiveChallenges) {
      // Get all accepted participants with scores
      const completedParticipants = challenge.participants.filter(
        (p) => p.score !== null && p.completedAt !== null
      );

      let winnerId: string | null = null;

      if (completedParticipants.length === 0) {
        // No one completed - challenge expires with no winner
        await prisma.challenge.update({
          where: { id: challenge.id },
          data: {
            status: "EXPIRED",
            completedAt: now,
          },
        });
        processed++;
        continue;
      }

      if (completedParticipants.length === 1) {
        // Only one person completed - they win
        winnerId = completedParticipants[0].userId;
      } else {
        // Multiple people completed - highest score wins
        const winnerParticipant = completedParticipants.reduce((prev, curr) =>
          (curr.score || 0) > (prev.score || 0) ? curr : prev
        );
        winnerId = winnerParticipant.userId;
      }

      if (winnerId) {
        // Calculate points: 15,000 * (number of other accepted participants)
        const acceptedParticipants = challenge.participants.filter(
          (p) => p.status === "ACCEPTED"
        );
        const otherParticipantsCount = Math.max(
          0,
          acceptedParticipants.length - 1
        );
        const pointsAwarded = 15000 * otherParticipantsCount;

        // Award points to winner
        if (pointsAwarded > 0) {
          const winner = await prisma.user.findUnique({
            where: { id: winnerId },
          });

          if (winner) {
            const experienceResult = addExperience(
              winner.level,
              winner.experience,
              pointsAwarded
            );

            await prisma.user.update({
              where: { id: winnerId },
              data: {
                level: experienceResult.newLevel,
                experience: experienceResult.newExperience,
              },
            });
          }
        }

        // Update challenge
        await prisma.challenge.update({
          where: { id: challenge.id },
          data: {
            status: "EXPIRED",
            winnerId: winnerId,
            completedAt: now,
          },
        });

        processed++;
      }
    }

    return { processed };
  } catch (error) {
    console.error("Error processing expired challenges:", error);
    return { processed: 0, error: String(error) };
  }
}

