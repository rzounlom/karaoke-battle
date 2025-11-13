import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { publishTournamentEvent } from "@/lib/ably-server";

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
    const { sessionCode, requestId, approved, displayName, userId, temporaryName } = body;

    if (!sessionCode) {
      return NextResponse.json(
        { success: false, message: "Session code is required" },
        { status: 400 }
      );
    }

    if (!requestId) {
      return NextResponse.json(
        { success: false, message: "Request ID is required" },
        { status: 400 }
      );
    }

    const session = await prisma.tournamentSession.findUnique({
      where: { sessionCode },
      include: {
        host: true,
        participants: true,
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
        { success: false, message: "Only the host can approve join requests" },
        { status: 403 }
      );
    }

    // Check if tournament is still IN_PROGRESS
    if (session.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { success: false, message: "Tournament is no longer in progress" },
        { status: 400 }
      );
    }

    // Check if tournament is full
    if (session.participants.length >= session.maxPlayers) {
      return NextResponse.json(
        { success: false, message: "Tournament is full" },
        { status: 400 }
      );
    }

    if (!approved) {
      // Just notify the requester that their request was denied
      await publishTournamentEvent(sessionCode, "join_request_denied", {
        requestId,
        displayName,
      });

      return NextResponse.json({
        success: true,
        message: "Join request denied",
      });
    }

    // Approve the request - add the participant
    const finalDisplayName = displayName || temporaryName || "Player";
    const finalUserId = userId || null;
    const finalHasAccount = !!userId;

    // Check if user/name already in session (race condition check)
    const existingParticipant = session.participants.find(
      (p) =>
        (finalUserId && p.userId === finalUserId) ||
        (!finalUserId && p.displayName.toLowerCase() === finalDisplayName.toLowerCase())
    );

    if (existingParticipant) {
      return NextResponse.json(
        {
          success: false,
          message: "User is already in this tournament",
        },
        { status: 400 }
      );
    }

    // Check if display name is already taken
    const nameTaken = session.participants.some(
      (p) => p.displayName.toLowerCase() === finalDisplayName.toLowerCase()
    );

    if (nameTaken) {
      return NextResponse.json(
        {
          success: false,
          message: "This name is already taken in this tournament",
        },
        { status: 400 }
      );
    }

    // Calculate next turn order
    const nextTurnOrder = session.participants.length + 1;

    // Create participant
    const participant = await prisma.tournamentParticipant.create({
      data: {
        sessionId: session.id,
        userId: finalUserId,
        temporaryName: finalHasAccount ? null : finalDisplayName,
        displayName: finalDisplayName,
        turnOrder: nextTurnOrder,
        isReady: false,
        hasAccount: finalHasAccount,
      },
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

    // Broadcast player joined event via Ably
    await publishTournamentEvent(sessionCode, "player_joined", {
      participant: {
        id: participant.id,
        displayName: participant.displayName,
        turnOrder: participant.turnOrder,
        isReady: participant.isReady,
        hasAccount: participant.hasAccount,
        user: participant.user,
      },
    });

    // Notify the requester that their request was approved
    await publishTournamentEvent(sessionCode, "join_request_approved", {
      requestId,
      displayName: finalDisplayName,
      participant: {
        id: participant.id,
        displayName: participant.displayName,
        turnOrder: participant.turnOrder,
        isReady: participant.isReady,
        hasAccount: participant.hasAccount,
        user: participant.user,
      },
    });

    // Broadcast session update
    await publishTournamentEvent(sessionCode, "session_updated", {
      session: updatedSession,
    });

    return NextResponse.json({
      success: true,
      message: "Join request approved",
      participant: {
        id: participant.id,
        displayName: participant.displayName,
        turnOrder: participant.turnOrder,
        isReady: participant.isReady,
        hasAccount: participant.hasAccount,
        user: participant.user,
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
    console.error("Error approving join request:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

