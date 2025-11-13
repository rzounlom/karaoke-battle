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

    if (!participantId) {
      return NextResponse.json(
        { success: false, message: "Participant ID is required" },
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

    // Only allow removal if tournament hasn't started
    if (session.status !== TournamentSessionStatus.WAITING && session.status !== TournamentSessionStatus.STARTING) {
      return NextResponse.json(
        { success: false, message: "Cannot remove participants after tournament has started" },
        { status: 400 }
      );
    }

    // Verify current user is the host
    let dbUser = null;
    if (user) {
      dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
      });
    }

    if (!dbUser || session.hostId !== dbUser.id) {
      return NextResponse.json(
        { success: false, message: "Only the host can remove participants" },
        { status: 403 }
      );
    }

    // Find the participant to remove
    const participantToRemove = session.participants.find(
      (p) => p.id === participantId
    );

    if (!participantToRemove) {
      return NextResponse.json(
        { success: false, message: "Participant not found" },
        { status: 404 }
      );
    }

    // Prevent host from removing themselves
    if (participantToRemove.userId === dbUser.id) {
      return NextResponse.json(
        { success: false, message: "Host cannot remove themselves from the tournament" },
        { status: 400 }
      );
    }

    // Delete the participant
    await prisma.tournamentParticipant.delete({
      where: { id: participantId },
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
    await publishTournamentEvent(sessionCode, "player_removed", {
      participantId: participantId,
      removedBy: dbUser.id,
    });

    // Also broadcast a general session update
    await publishTournamentEvent(sessionCode, "session_updated", {
      session: updatedSession,
    });

    return NextResponse.json({
      success: true,
      message: "Participant removed successfully",
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
    console.error("Error removing participant:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

