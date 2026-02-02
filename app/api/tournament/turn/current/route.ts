import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { TurnStatus } from "@prisma/client";
import { moveToNextTurn } from "@/lib/tournament-utils";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    const { searchParams } = new URL(req.url);
    const sessionCode = searchParams.get("sessionCode");
    const participantId = searchParams.get("participantId"); // For guests

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
    if (session.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { success: false, message: "Tournament is not in progress" },
        { status: 400 }
      );
    }

    // Get current turn (most recent PENDING or IN_PROGRESS turn)
    // Order by turnNumber desc to get the latest turn, then by createdAt desc as tiebreaker
    let currentTurn = await prisma.tournamentTurn.findFirst({
      where: {
        sessionId: session.id,
        status: {
          in: [TurnStatus.PENDING, TurnStatus.IN_PROGRESS],
        },
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
      orderBy: [
        { turnNumber: "desc" },
        { createdAt: "desc" },
      ],
    });

    // Check if current turn has expired and handle it
    if (currentTurn && currentTurn.expiresAt && new Date() > currentTurn.expiresAt) {
      // Turn expired - mark as SKIPPED and move to next turn
      await prisma.tournamentTurn.update({
        where: { id: currentTurn.id },
        data: {
          status: TurnStatus.SKIPPED,
          score: currentTurn.status === TurnStatus.IN_PROGRESS ? 0 : null,
          completedAt: new Date(),
        },
      });

      // Move to next turn (or complete tournament if all done)
      // Pass the participant ID so we can check if they get a second chance
      const nextTurn = await moveToNextTurn(
        session.id,
        sessionCode,
        currentTurn.participant.turnOrder,
        currentTurn.participantId // Pass participant ID for second chance logic
      );

      // If tournament completed, return that info
      if (!nextTurn) {
        return NextResponse.json({
          success: false,
          message: "Tournament completed - all turns finished",
          tournamentCompleted: true,
        });
      }

      // Get the newly created turn
      currentTurn = await prisma.tournamentTurn.findUnique({
        where: { id: nextTurn.id },
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

      if (!currentTurn) {
        return NextResponse.json(
          { success: false, message: "No active turn found" },
          { status: 404 }
        );
      }
    }

    if (!currentTurn) {
      return NextResponse.json(
        { success: false, message: "No active turn found" },
        { status: 404 }
      );
    }

    // Determine if this is the current user's turn
    let isMyTurn = false;
    let currentParticipantId: string | null = null;

    if (user) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
      });
      if (dbUser) {
        const participant = session.participants.find(
          (p) => p.userId === dbUser.id
        );
        if (participant) {
          currentParticipantId = participant.id;
          isMyTurn = participant.id === currentTurn.participantId;
        }
      }
    } else if (participantId) {
      // For guests, check by participantId
      currentParticipantId = participantId;
      isMyTurn = participantId === currentTurn.participantId;
    }

    // Calculate time remaining for song selection (if PENDING)
    let timeRemaining: number | null = null;
    if (currentTurn.status === TurnStatus.PENDING && currentTurn.expiresAt) {
      const now = new Date();
      const expires = new Date(currentTurn.expiresAt);
      timeRemaining = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / 1000));
    }

    return NextResponse.json({
      success: true,
      turn: {
        id: currentTurn.id,
        turnNumber: currentTurn.turnNumber,
        participant: {
          id: currentTurn.participant.id,
          displayName: currentTurn.participant.displayName,
          turnOrder: currentTurn.participant.turnOrder,
          user: currentTurn.participant.user,
        },
        song: currentTurn.song,
        status: currentTurn.status,
        startedAt: currentTurn.startedAt,
        expiresAt: currentTurn.expiresAt,
        timeRemaining,
      },
      isMyTurn,
      currentParticipantId,
    });
  } catch (error) {
    console.error("Error fetching current turn:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

