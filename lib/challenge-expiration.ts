import { prisma } from "@/lib/prisma";
import { addExperience } from "@/lib/experience";

/**
 * Check and process expired challenges
 * This should be called:
 * - On challenge submission
 * - When loading the battles page
 * - By a cron job if available
 */
export async function processExpiredChallenges() {
  try {
    // Find all challenges that have expired but haven't been marked as EXPIRED or COMPLETED
    const now = new Date();
    const expiredChallenges = await prisma.challenge.findMany({
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

    if (expiredChallenges.length === 0) {
      return { processed: 0 };
    }

    let processed = 0;

    for (const challenge of expiredChallenges) {
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

