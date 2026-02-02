import { NextRequest, NextResponse } from "next/server";
import { TournamentSessionStatus, TurnStatus } from "@prisma/client";
import { addExperience, calculateExperienceFromScore } from "@/lib/experience";

import { currentUser } from "@clerk/nextjs/server";
import { moveToNextTurn } from "@/lib/tournament-utils";
import { prisma } from "@/lib/prisma";
import { publishTournamentEvent } from "@/lib/ably-server";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    const body = await req.json();
    const { sessionCode, turnId, score, participantId } = body;

    if (!sessionCode || !turnId || typeof score !== "number") {
      return NextResponse.json(
        {
          success: false,
          message: "Session code, turn ID, and score are required",
        },
        { status: 400 }
      );
    }

    // Get tournament session
    const session = await prisma.tournamentSession.findUnique({
      where: { sessionCode },
      include: {
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
                experience: true,
              },
            },
          },
          orderBy: { turnOrder: "asc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Tournament session not found" },
        { status: 404 }
      );
    }

    // Check if tournament is in progress
    if (session.status !== TournamentSessionStatus.IN_PROGRESS) {
      return NextResponse.json(
        { success: false, message: "Tournament is not in progress" },
        { status: 400 }
      );
    }

    // Get the turn
    const turn = await prisma.tournamentTurn.findUnique({
      where: { id: turnId },
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
                level: true,
                experience: true,
              },
            },
          },
        },
        song: {
          select: {
            id: true,
            customId: true,
            title: true,
            artist: true,
            difficulty: true,
          },
        },
      },
    });

    if (!turn) {
      return NextResponse.json(
        { success: false, message: "Turn not found" },
        { status: 404 }
      );
    }

    // Verify it's the current user's turn
    let isMyTurn = false;
    if (user) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
      });
      if (dbUser) {
        const participant = session.participants.find(
          (p) => p.userId === dbUser.id
        );
        if (participant) {
          isMyTurn = participant.id === turn.participantId;
        }
      }
    } else if (participantId) {
      // For guests, check by participantId
      isMyTurn = participantId === turn.participantId;
    }

    if (!isMyTurn) {
      return NextResponse.json(
        { success: false, message: "It's not your turn" },
        { status: 403 }
      );
    }

    // Check if turn is IN_PROGRESS
    if (turn.status !== TurnStatus.IN_PROGRESS) {
      return NextResponse.json(
        { success: false, message: "Turn is not in progress" },
        { status: 400 }
      );
    }

    // Validate score
    const validScore = Math.max(0, Math.min(100, Math.floor(score)));

    // Update turn with score
    const updatedTurn = await prisma.tournamentTurn.update({
      where: { id: turnId },
      data: {
        score: validScore,
        status: TurnStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Update participant total score
    const participant = await prisma.tournamentParticipant.findUnique({
      where: { id: turn.participantId },
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, message: "Participant not found" },
        { status: 404 }
      );
    }

    const newTotalScore = (participant.totalScore || 0) + validScore;

    const updatedParticipant = await prisma.tournamentParticipant.update({
      where: { id: turn.participantId },
      data: {
        totalScore: newTotalScore,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            level: true,
            experience: true,
          },
        },
      },
    });

    // Award XP to signed-in users (hasAccount: true)
    let xpAwarded = 0;
    let leveledUp = false;
    if (updatedParticipant.hasAccount && updatedParticipant.user) {
      try {
        // Calculate XP from score (using default values for accuracy/timing/pitch)
        // In a real implementation, you'd pass these from the gameplay
        const accuracy = validScore; // Use score as approximation
        const timing = validScore;
        const pitch = validScore;
        const songDifficulty = turn.song?.difficulty || "MEDIUM";

        xpAwarded = calculateExperienceFromScore(
          validScore,
          accuracy,
          timing,
          pitch,
          songDifficulty as "EASY" | "MEDIUM" | "HARD"
        );

        // Calculate new level and experience
        const experienceResult = addExperience(
          updatedParticipant.user.level,
          updatedParticipant.user.experience,
          xpAwarded
        );

        leveledUp = experienceResult.leveledUp;

        // Update user's experience and level
        await prisma.user.update({
          where: { id: updatedParticipant.user.id },
          data: {
            level: experienceResult.newLevel,
            experience: experienceResult.newExperience,
          },
        });
      } catch (error) {
        console.error("Error awarding XP:", error);
        // Don't fail the request if XP calculation fails
      }
    }

    // Move to next turn (or complete tournament if all done)
    // No skipped participant ID since this is a completed turn (not skipped)
    const nextTurn = await moveToNextTurn(
      session.id,
      sessionCode,
      turn.participant.turnOrder
      // No skippedParticipantId - this is a completed turn, not a skip
    );

    // Get updated leaderboard
    const allParticipants = await prisma.tournamentParticipant.findMany({
      where: { sessionId: session.id },
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
      orderBy: { totalScore: "desc" },
    });

    // Broadcast score submitted event
    await publishTournamentEvent(sessionCode, "score_submitted", {
      turn: {
        id: updatedTurn.id,
        turnNumber: updatedTurn.turnNumber,
        score: validScore,
        status: updatedTurn.status,
      },
      participant: {
        id: updatedParticipant.id,
        displayName: updatedParticipant.displayName,
        totalScore: newTotalScore,
      },
      nextTurn: nextTurn
        ? {
            id: nextTurn.id,
            turnNumber: nextTurn.turnNumber,
            participant: {
              id: nextTurn.participant.id,
              displayName: nextTurn.participant.displayName,
              turnOrder: nextTurn.participant.turnOrder,
            },
          }
        : null,
    });

    return NextResponse.json({
      success: true,
      message: "Score submitted successfully",
      turn: {
        id: updatedTurn.id,
        score: validScore,
        status: updatedTurn.status,
      },
      participant: {
        id: updatedParticipant.id,
        totalScore: newTotalScore,
      },
      xpAwarded: xpAwarded > 0 ? xpAwarded : undefined,
      leveledUp: leveledUp || undefined,
      nextTurn: nextTurn
        ? {
            id: nextTurn.id,
            turnNumber: nextTurn.turnNumber,
            participant: {
              id: nextTurn.participant.id,
              displayName: nextTurn.participant.displayName,
              turnOrder: nextTurn.participant.turnOrder,
            },
          }
        : null,
      leaderboard: allParticipants.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        totalScore: p.totalScore,
        turnOrder: p.turnOrder,
        user: p.user,
      })),
    });
  } catch (error) {
    console.error("Error submitting score:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
