import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { TournamentSessionStatus } from "@prisma/client";
import { publishTournamentEvent } from "@/lib/ably-server";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    const body = await req.json();
    const { sessionCode, participantId } = body;

    if (!sessionCode) {
      return NextResponse.json(
        { success: false, message: "Session code is required" },
        { status: 400 }
      );
    }

    const session = await prisma.tournamentSession.findUnique({
      where: { sessionCode },
      include: {
        host: true,
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

    // Check if session is expired
    if (session.expiresAt && new Date() > session.expiresAt) {
      return NextResponse.json(
        { success: false, message: "This tournament session has expired" },
        { status: 410 }
      );
    }

    // Only allow leaving if tournament hasn't started
    if (session.status !== TournamentSessionStatus.WAITING && session.status !== TournamentSessionStatus.STARTING) {
      return NextResponse.json(
        { success: false, message: "Cannot leave after tournament has started" },
        { status: 400 }
      );
    }

    // Find the participant to remove
    let participantToLeave = null;
    
    if (user) {
      // For authenticated users, find by user ID
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
      });
      if (dbUser) {
        participantToLeave = session.participants.find(
          (p) => p.userId === dbUser.id
        );
      }
    } else {
      // For unauthenticated users (guests), must provide participantId
      if (!participantId) {
        return NextResponse.json(
          { success: false, message: "Participant ID is required for guest users" },
          { status: 400 }
        );
      }
      participantToLeave = session.participants.find((p) => p.id === participantId);
      
      // Security: Guest participants must not have a userId (they're truly guests)
      if (participantToLeave && participantToLeave.userId) {
        return NextResponse.json(
          { success: false, message: "Authenticated users must sign in to leave" },
          { status: 403 }
        );
      }
    }

    if (!participantToLeave) {
      return NextResponse.json(
        { success: false, message: "You are not a participant in this tournament" },
        { status: 404 }
      );
    }

    // Prevent host from leaving (they should cancel the tournament instead)
    if (session.hostId === participantToLeave.userId) {
      return NextResponse.json(
        { success: false, message: "Host cannot leave the tournament. Please cancel it instead." },
        { status: 400 }
      );
    }

    // Delete the participant
    await prisma.tournamentParticipant.delete({
      where: { id: participantToLeave.id },
    });

    // Re-fetch the updated session
    const updatedSession = await prisma.tournamentSession.findUnique({
      where: { id: session.id },
      include: {
        host: {
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
          orderBy: { turnOrder: "asc" },
        },
      },
    });

    if (!updatedSession) {
      return NextResponse.json(
        { success: false, message: "Failed to update session" },
        { status: 500 }
      );
    }

    // Broadcast player left event via Ably
    await publishTournamentEvent(sessionCode, "player_left", {
      participantId: participantToLeave.id,
      displayName: participantToLeave.displayName,
    });

    // Also broadcast a general session update
    await publishTournamentEvent(sessionCode, "session_updated", {
      session: updatedSession,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully left the tournament",
      session: {
        id: updatedSession.id,
        sessionCode: updatedSession.sessionCode,
        name: updatedSession.name,
        status: updatedSession.status,
        maxPlayers: updatedSession.maxPlayers,
        currentPlayers: updatedSession.participants.length,
        host: {
          id: updatedSession.host.id,
          displayName:
            updatedSession.host.username ||
            `${updatedSession.host.firstName || ""} ${updatedSession.host.lastName || ""}`.trim() ||
            "Host",
          avatar: updatedSession.host.avatar,
        },
        participants: updatedSession.participants.map((p) => ({
          id: p.id,
          displayName: p.displayName,
          turnOrder: p.turnOrder,
          isReady: p.isReady,
          hasAccount: p.hasAccount,
          user: p.user,
        })),
        settings: updatedSession.settings,
        createdAt: updatedSession.createdAt,
      },
    });
  } catch (error) {
    console.error("Error leaving tournament:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

