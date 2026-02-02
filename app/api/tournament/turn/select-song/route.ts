import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { TurnStatus } from "@prisma/client";
import { publishTournamentEvent } from "@/lib/ably-server";
import { moveToNextTurn } from "@/lib/tournament-utils";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    const body = await req.json();
    const { sessionCode, turnId, songId, participantId } = body;

    if (!sessionCode || !turnId || !songId) {
      return NextResponse.json(
        { success: false, message: "Session code, turn ID, and song ID are required" },
        { status: 400 }
      );
    }

    // Get tournament session
    const session = await prisma.tournamentSession.findUnique({
      where: { sessionCode },
      include: {
        participants: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Tournament session not found" },
        { status: 404 }
      );
    }

    // Check if tournament is in progress
    if (session.status !== "IN_PROGRESS") {
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
              },
            },
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

    // Check if turn is in PENDING status (song selection phase)
    if (turn.status !== TurnStatus.PENDING) {
      return NextResponse.json(
        { success: false, message: "Song selection is not available for this turn" },
        { status: 400 }
      );
    }

    // Check if time has expired
    if (turn.expiresAt && new Date() > turn.expiresAt) {
      // Time expired - mark as SKIPPED and move to next turn
      await prisma.tournamentTurn.update({
        where: { id: turnId },
        data: {
          status: TurnStatus.SKIPPED,
          score: 0,
          completedAt: new Date(),
        },
      });

      // Move to next turn (or complete tournament if all done)
      // Pass the participant ID so we can check if they get a second chance
      const nextTurn = await moveToNextTurn(
        session.id,
        sessionCode,
        turn.participant.turnOrder,
        turn.participantId // Pass participant ID for second chance logic
      );

      return NextResponse.json({
        success: false,
        message: "Time expired for song selection. Your turn was skipped.",
        skipped: true,
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
        tournamentCompleted: !nextTurn,
      });
    }

    // Verify song exists - lookup by customId first (from songs-data.ts), then by id
    let song = await prisma.song.findUnique({
      where: { customId: songId },
    });

    // If not found by customId, try by id (database primary key)
    if (!song) {
      song = await prisma.song.findUnique({
        where: { id: songId },
      });
    }

    if (!song) {
      return NextResponse.json(
        { success: false, message: "Song not found" },
        { status: 404 }
      );
    }

    // Update turn with song selection
    const songSelectionTimeLimit =
      (session.settings as { songSelectionTimeLimit?: number })
        ?.songSelectionTimeLimit || 60;
    const turnTimeLimit =
      (session.settings as { turnTimeLimit?: number })?.turnTimeLimit || 300;

    const now = new Date();
    const gameplayExpiresAt = new Date(now.getTime() + turnTimeLimit * 1000);

    const updatedTurn = await prisma.tournamentTurn.update({
      where: { id: turnId },
      data: {
        songId: song.id, // Use database song ID, not customId
        status: TurnStatus.IN_PROGRESS,
        startedAt: now,
        expiresAt: gameplayExpiresAt, // Update to gameplay time limit
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
        song: {
          select: {
            id: true,
            customId: true,
            title: true,
            artist: true,
            thumbnail: true,
          },
        },
      },
    });

    // Broadcast song selected event via Ably
    await publishTournamentEvent(sessionCode, "song_selected", {
      turn: {
        id: updatedTurn.id,
        turnNumber: updatedTurn.turnNumber,
        participant: {
          id: updatedTurn.participant.id,
          displayName: updatedTurn.participant.displayName,
          turnOrder: updatedTurn.participant.turnOrder,
        },
        song: {
          id: updatedTurn.song?.id,
          title: updatedTurn.song?.title,
          artist: updatedTurn.song?.artist,
        },
        status: updatedTurn.status,
        startedAt: updatedTurn.startedAt,
        expiresAt: updatedTurn.expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Song selected successfully",
      turn: {
        id: updatedTurn.id,
        turnNumber: updatedTurn.turnNumber,
        participant: {
          id: updatedTurn.participant.id,
          displayName: updatedTurn.participant.displayName,
          turnOrder: updatedTurn.participant.turnOrder,
        },
        song: updatedTurn.song,
        status: updatedTurn.status,
        startedAt: updatedTurn.startedAt,
        expiresAt: updatedTurn.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error selecting song:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

