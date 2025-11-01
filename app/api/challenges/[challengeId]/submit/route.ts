import { NextRequest, NextResponse } from "next/server";

// import { ChallengeStatus } from "@prisma/client";
import { addExperience } from "@/lib/experience";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { challengeId } = await params;
    const body = await req.json();
    const { totalScore } = body;

    if (!challengeId) {
      return NextResponse.json(
        { success: false, message: "Challenge ID is required" },
        { status: 400 }
      );
    }

    if (typeof totalScore !== "number" || totalScore < 0) {
      return NextResponse.json(
        { success: false, message: "Invalid score" },
        { status: 400 }
      );
    }

    // Get current user from database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Find the challenge with participants
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        challenger: true,
        song: true,
        winner: true,
        participants: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { success: false, message: "Challenge not found" },
        { status: 404 }
      );
    }

    // Find participant record for current user
    const participant = challenge.participants.find(
      (p) => p.userId === dbUser.id
    );

    if (!participant) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not a participant in this challenge",
        },
        { status: 403 }
      );
    }

    // Validate participant has accepted
    if (participant.status !== "ACCEPTED") {
      return NextResponse.json(
        {
          success: false,
          message: "You must accept the challenge before submitting a score",
        },
        { status: 400 }
      );
    }

    // Validate challenge status
    if (challenge.status === "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "Challenge must be accepted before submitting scores",
        },
        { status: 400 }
      );
    }

    if (
      challenge.status === "COMPLETED" ||
      challenge.status === "EXPIRED" ||
      challenge.status === "CANCELLED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot submit score to a completed or closed challenge",
        },
        { status: 400 }
      );
    }

    // Check if user already submitted a score
    if (participant.score !== null) {
      return NextResponse.json(
        {
          success: false,
          message: "You have already submitted your score for this challenge",
        },
        { status: 400 }
      );
    }

    // Check if challenge expired
    if (challenge.expiresAt && new Date() > challenge.expiresAt) {
      // Challenge expired - determine winner from participants who completed
      const completedParticipants = challenge.participants.filter(
        (p) => p.status === "ACCEPTED" && p.score !== null
      );

      let winnerId: string | null = null;
      if (completedParticipants.length > 0) {
        // Find participant with highest score
        const winnerParticipant = completedParticipants.reduce((prev, curr) =>
          (curr.score || 0) > (prev.score || 0) ? curr : prev
        );
        winnerId = winnerParticipant.userId;
      } else if (participant) {
        // If submitting after expiration and no one else completed, this user wins by default
        winnerId = dbUser.id;
      }

      // Update participant score even if expired
      await prisma.challengeParticipant.update({
        where: { id: participant.id },
        data: {
          score: Math.round(totalScore),
          completedAt: new Date(),
        },
      });

      if (winnerId && !challenge.winnerId) {
        // Award points to winner: 15,000 * (number of other participants who completed)
        const completedCount = challenge.participants.filter(
          (p) => p.status === "ACCEPTED" && p.score !== null
        ).length;
        const otherParticipantsCount = Math.max(0, completedCount - 1);
        const pointsAwarded = 15000 * otherParticipantsCount;

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

        await prisma.challenge.update({
          where: { id: challengeId },
          data: {
            status: "EXPIRED",
            winnerId: winnerId,
            completedAt: new Date(),
          },
        });
      }

      const updatedChallenge = await prisma.challenge.findUnique({
        where: { id: challengeId },
        include: {
          challenger: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          song: {
            select: {
              id: true,
              customId: true,
              title: true,
              artist: true,
              thumbnail: true,
            },
          },
          winner: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          participants: {
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

      return NextResponse.json({
        success: true,
        message: "Challenge expired. Score submitted but challenge is closed.",
        challenge: updatedChallenge,
        expired: true,
      });
    }

    // Update participant with score
    await prisma.challengeParticipant.update({
      where: { id: participant.id },
      data: {
        score: Math.round(totalScore),
        completedAt: new Date(),
      },
    });

    // Get all accepted participants
    const acceptedParticipants = challenge.participants.filter(
      (p) => p.status === "ACCEPTED"
    );

    // Get updated participant data to check if all have completed
    const updatedParticipants = await prisma.challengeParticipant.findMany({
      where: {
        challengeId: challengeId,
        status: "ACCEPTED",
      },
    });

    // Check if all accepted participants have submitted scores
    const allCompleted = acceptedParticipants.every((p) => {
      const updated = updatedParticipants.find((up) => up.id === p.id);
      return updated?.score !== null;
    });

    let winnerId: string | null = null;
    let pointsAwarded = 0;

    if (allCompleted) {
      // All completed - determine winner (highest score)
      const completedWithScores = updatedParticipants.filter(
        (p) => p.score !== null
      );

      if (completedWithScores.length > 0) {
        // Find participant with highest score
        const winnerParticipant = completedWithScores.reduce((prev, curr) =>
          (curr.score || 0) > (prev.score || 0) ? curr : prev
        );
        winnerId = winnerParticipant.userId;

        // Calculate points: 15,000 * (number of other participants who completed)
        const otherParticipantsCount = Math.max(
          0,
          completedWithScores.length - 1
        );
        pointsAwarded = 15000 * otherParticipantsCount;

        if (pointsAwarded > 0 && winnerId) {
          // Award points to winner
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
      }

      // Update challenge as completed
      await prisma.challenge.update({
        where: { id: challengeId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          winnerId: winnerId,
        },
      });
    } else {
      // Not all completed - update status to IN_PROGRESS if not already
      if (challenge.status === "ACCEPTED") {
        await prisma.challenge.update({
          where: { id: challengeId },
          data: {
            status: "IN_PROGRESS",
          },
        });
      }
    }

    // Fetch updated challenge
    const updatedChallenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        challenger: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            level: true,
          },
        },
        song: {
          select: {
            id: true,
            customId: true,
            title: true,
            artist: true,
            thumbnail: true,
          },
        },
        winner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
                level: true,
              },
            },
          },
        },
      },
    });

    const isWinner = winnerId === dbUser.id;

    return NextResponse.json({
      success: true,
      message: allCompleted
        ? isWinner
          ? `Congratulations! You won the challenge and earned ${pointsAwarded.toLocaleString()} points!`
          : "Challenge completed! Better luck next time!"
        : "Score submitted! Waiting for other participants to complete.",
      challenge: updatedChallenge,
      allCompleted,
      winner: isWinner,
      pointsAwarded: isWinner ? pointsAwarded : 0,
    });
  } catch (error) {
    console.error("Error submitting challenge score:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
