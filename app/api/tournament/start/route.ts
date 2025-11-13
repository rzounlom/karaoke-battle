import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { publishTournamentEvent } from "@/lib/ably-server";
import { TournamentSessionStatus, TurnStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { sessionCode } = body;

    if (!sessionCode) {
      return NextResponse.json(
        { success: false, message: "Session code is required" },
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
              },
            },
          },
          orderBy: {
            turnOrder: "asc",
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Tournament session not found" },
        { status: 404 }
      );
    }

    // Verify user is the host
    if (session.hostId !== dbUser.id) {
      return NextResponse.json(
        { success: false, message: "Only the host can start the tournament" },
        { status: 403 }
      );
    }

    // Check if session is expired
    if (session.expiresAt && new Date() > session.expiresAt) {
      return NextResponse.json(
        { success: false, message: "This tournament session has expired" },
        { status: 410 }
      );
    }

    // Check if tournament has already started
    if (session.status === TournamentSessionStatus.IN_PROGRESS) {
      return NextResponse.json(
        { success: false, message: "Tournament has already started" },
        { status: 400 }
      );
    }

    if (
      session.status === TournamentSessionStatus.COMPLETED ||
      session.status === TournamentSessionStatus.CANCELLED
    ) {
      return NextResponse.json(
        { success: false, message: "Tournament has already ended" },
        { status: 400 }
      );
    }

    // Validate minimum players (at least 2)
    if (session.participants.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Need at least 2 players to start the tournament",
        },
        { status: 400 }
      );
    }

    // Check if all players are ready (optional - can be made configurable)
    const allReady = session.participants.every((p) => p.isReady);
    if (!allReady) {
      return NextResponse.json(
        {
          success: false,
          message: "All players must be ready before starting",
        },
        { status: 400 }
      );
    }

    // Update session status to IN_PROGRESS
    const updatedSession = await prisma.tournamentSession.update({
      where: { sessionCode },
      data: {
        status: TournamentSessionStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
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
              },
            },
          },
          orderBy: {
            turnOrder: "asc",
          },
        },
      },
    });

    // Create first turn for the first participant (host goes first)
    const firstParticipant = updatedSession.participants[0];
    const firstTurn = await prisma.tournamentTurn.create({
      data: {
        sessionId: updatedSession.id,
        participantId: firstParticipant.id,
        turnNumber: 1,
        status: TurnStatus.PENDING,
        // Song selection time limit from settings
        expiresAt: new Date(
          Date.now() +
            ((updatedSession.settings as { songSelectionTimeLimit?: number })
              ?.songSelectionTimeLimit || 60) *
              1000
        ),
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

    // Broadcast tournament started event via Ably
    await publishTournamentEvent(sessionCode, "tournament_started", {
      session: {
        id: updatedSession.id,
        sessionCode: updatedSession.sessionCode,
        name: updatedSession.name,
        status: updatedSession.status,
        startedAt: updatedSession.startedAt,
      },
      firstTurn: {
        id: firstTurn.id,
        turnNumber: firstTurn.turnNumber,
        participant: {
          id: firstParticipant.id,
          displayName: firstParticipant.displayName,
          turnOrder: firstParticipant.turnOrder,
        },
        status: firstTurn.status,
        expiresAt: firstTurn.expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tournament started successfully",
      session: {
        id: updatedSession.id,
        sessionCode: updatedSession.sessionCode,
        name: updatedSession.name,
        status: updatedSession.status,
        startedAt: updatedSession.startedAt,
        participants: updatedSession.participants.map((p) => ({
          id: p.id,
          displayName: p.displayName,
          turnOrder: p.turnOrder,
          isReady: p.isReady,
          hasAccount: p.hasAccount,
          user: p.user,
        })),
      },
      firstTurn: {
        id: firstTurn.id,
        turnNumber: firstTurn.turnNumber,
        participant: {
          id: firstParticipant.id,
          displayName: firstParticipant.displayName,
          turnOrder: firstParticipant.turnOrder,
        },
        status: firstTurn.status,
        expiresAt: firstTurn.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error starting tournament:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

