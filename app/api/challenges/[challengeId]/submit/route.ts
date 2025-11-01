import { NextRequest, NextResponse } from "next/server";

import { ChallengeStatus } from "@prisma/client";
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

    // Find the challenge
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        challenger: true,
        challenged: true,
        song: true,
        winner: true,
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { success: false, message: "Challenge not found" },
        { status: 404 }
      );
    }

    // Validate user is a participant
    const isChallenger = challenge.challengerId === dbUser.id;
    const isChallenged = challenge.challengedId === dbUser.id;

    if (!isChallenger && !isChallenged) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not a participant in this challenge",
        },
        { status: 403 }
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
      challenge.status === "DECLINED" ||
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
    if (isChallenger && challenge.challengerScore !== null) {
      return NextResponse.json(
        {
          success: false,
          message: "You have already submitted your score for this challenge",
        },
        { status: 400 }
      );
    }

    if (isChallenged && challenge.challengedScore !== null) {
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
      // Challenge expired - determine winner
      const winnerId =
        challenge.challengerScore !== null && challenge.challengedScore !== null
          ? challenge.challengerScore > challenge.challengedScore
            ? challenge.challengerId
            : challenge.challengedId
          : challenge.challengerScore !== null
          ? challenge.challengerId
          : challenge.challengedScore !== null
          ? challenge.challengedId
          : null;

      if (winnerId) {
        // Award points to winner
        const winner = await prisma.user.findUnique({
          where: { id: winnerId },
        });

        if (winner) {
          const experienceResult = addExperience(
            winner.level,
            winner.experience,
            15000 // Challenge win bonus
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

      const updatedChallenge = await prisma.challenge.update({
        where: { id: challengeId },
        data: {
          status: "EXPIRED",
          winnerId: winnerId,
          completedAt: new Date(),
        },
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
          challenged: {
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
        },
      });

      return NextResponse.json({
        success: true,
        message: "Challenge expired. Score submitted but challenge is closed.",
        challenge: updatedChallenge,
        expired: true,
      });
    }

    // Update challenge with user's score
    const updateData: {
      challengerScore?: number;
      challengedScore?: number;
      challengerCompletedAt?: Date;
      challengedCompletedAt?: Date;
      completedAt?: Date;
      status: ChallengeStatus;
      winnerId?: string | null;
    } = {
      status: "IN_PROGRESS",
    };

    if (isChallenger) {
      updateData.challengerScore = Math.round(totalScore);
      updateData.challengerCompletedAt = new Date();
    } else {
      updateData.challengedScore = Math.round(totalScore);
      updateData.challengedCompletedAt = new Date();
    }

    // Check if both players have completed
    const challengerCompleted =
      challenge.challengerScore !== null || isChallenger;
    const challengedCompleted =
      challenge.challengedScore !== null || isChallenged;

    let winnerId: string | null = null;

    if (challengerCompleted && challengedCompleted) {
      // Both completed - determine winner
      const finalChallengerScore = isChallenger
        ? Math.round(totalScore)
        : challenge.challengerScore || 0;
      const finalChallengedScore = isChallenged
        ? Math.round(totalScore)
        : challenge.challengedScore || 0;

      winnerId =
        finalChallengerScore > finalChallengedScore
          ? challenge.challengerId
          : finalChallengedScore > finalChallengerScore
          ? challenge.challengedId
          : null; // Tie - no winner

      updateData.status = "COMPLETED";
      updateData.completedAt = new Date();
      updateData.winnerId = winnerId;

      if (winnerId) {
        // Award 15,000 points to winner
        const winner = await prisma.user.findUnique({
          where: { id: winnerId },
        });

        if (winner) {
          const experienceResult = addExperience(
            winner.level,
            winner.experience,
            15000 // Challenge win bonus
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

      // Update challenge with all completion data
      await prisma.challenge.update({
        where: { id: challengeId },
        data: updateData,
      });
    } else {
      // Only one completed - update status
      await prisma.challenge.update({
        where: { id: challengeId },
        data: updateData,
      });
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
        challenged: {
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
      },
    });

    const bothCompleted = challengerCompleted && challengedCompleted;
    const isWinner = winnerId === dbUser.id;

    return NextResponse.json({
      success: true,
      message: bothCompleted
        ? isWinner
          ? "Congratulations! You won the challenge and earned 15,000 points!"
          : "Challenge completed! Better luck next time!"
        : "Score submitted! Waiting for your opponent to complete.",
      challenge: updatedChallenge,
      bothCompleted,
      winner: isWinner,
    });
  } catch (error) {
    console.error("Error submitting challenge score:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
