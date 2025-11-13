import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { publishTournamentEvent } from "@/lib/ably-server";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
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
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Tournament session not found" },
        { status: 404 }
      );
    }

    // Check if session is expired or already started
    if (session.expiresAt && new Date() > session.expiresAt) {
      return NextResponse.json(
        { success: false, message: "This tournament session has expired" },
        { status: 410 }
      );
    }

    if (session.status !== "WAITING" && session.status !== "STARTING") {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot change ready status after tournament has started",
        },
        { status: 400 }
      );
    }

    const { participantId } = body;

    // Find participant
    let participant = null;
    if (user) {
      // For authenticated users, must find by user ID
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
      });
      if (dbUser) {
        participant = session.participants.find(
          (p) => p.userId === dbUser.id
        );
      }
      // Security: Authenticated users cannot use participantId to toggle ready status
      // They must be found by their user ID
      if (!participant) {
        return NextResponse.json(
          {
            success: false,
            message: "You must be a participant to toggle ready status",
          },
          { status: 403 }
        );
      }
    } else {
      // For unauthenticated users (guests), must provide participantId
      if (!participantId) {
        return NextResponse.json(
          {
            success: false,
            message: "Participant ID is required for guest users",
          },
          { status: 400 }
        );
      }
      participant = session.participants.find((p) => p.id === participantId);
      
      // Security: Guest participants must not have a userId (they're truly guests)
      if (participant && participant.userId) {
        return NextResponse.json(
          {
            success: false,
            message: "Authenticated users must sign in to toggle ready status",
          },
          { status: 403 }
        );
      }
    }

    // If still not found, user is not a participant
    if (!participant) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be a participant to toggle ready status",
        },
        { status: 403 }
      );
    }

    // Toggle ready status
    const updatedParticipant = await prisma.tournamentParticipant.update({
      where: { id: participant.id },
      data: { isReady: !participant.isReady },
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
    });

    // Broadcast ready status change via Ably
    await publishTournamentEvent(sessionCode, "player_ready", {
      participantId: updatedParticipant.id,
      displayName: updatedParticipant.displayName,
      isReady: updatedParticipant.isReady,
    });

    // Get updated session with all participants
    const updatedSession = await prisma.tournamentSession.findUnique({
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

    return NextResponse.json({
      success: true,
      message: `You are now ${updatedParticipant.isReady ? "ready" : "not ready"}`,
      participant: {
        id: updatedParticipant.id,
        displayName: updatedParticipant.displayName,
        turnOrder: updatedParticipant.turnOrder,
        isReady: updatedParticipant.isReady,
        hasAccount: updatedParticipant.hasAccount,
        user: updatedParticipant.user,
      },
      session: updatedSession
        ? {
            id: updatedSession.id,
            sessionCode: updatedSession.sessionCode,
            name: updatedSession.name,
            status: updatedSession.status,
            maxPlayers: updatedSession.maxPlayers,
            currentPlayers: updatedSession.participants.length,
            participants: updatedSession.participants.map((p) => ({
              id: p.id,
              displayName: p.displayName,
              turnOrder: p.turnOrder,
              isReady: p.isReady,
              hasAccount: p.hasAccount,
              user: p.user,
            })),
          }
        : null,
    });
  } catch (error) {
    console.error("Error toggling ready status:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

