import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { publishTournamentEvent } from "@/lib/ably-server";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    const body = await req.json();
    const { sessionCode, temporaryName } = body;

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
        participants: true,
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

    // Check if session is completed or cancelled
    if (session.status === "COMPLETED" || session.status === "CANCELLED") {
      return NextResponse.json(
        {
          success: false,
          message: "This tournament has ended",
        },
        { status: 400 }
      );
    }

    // If tournament is IN_PROGRESS, require host approval
    const isInProgress = session.status === "IN_PROGRESS";
    const { hostApproval } = body;
    
    if (isInProgress) {
      // Check if there are slots available
      if (session.participants.length >= session.maxPlayers) {
        return NextResponse.json(
          { success: false, message: "Tournament is full" },
          { status: 400 }
        );
      }

      // Require host approval for IN_PROGRESS tournaments
      if (!hostApproval) {
        return NextResponse.json(
          {
            success: false,
            message: "Host approval required to join a tournament in progress",
            requiresHostApproval: true,
          },
          { status: 403 }
        );
      }

      // Verify the approval is from the host
      let dbUser = null;
      if (user) {
        dbUser = await prisma.user.findUnique({
          where: { clerkId: user.id },
        });
      }

      if (!dbUser || session.hostId !== dbUser.id) {
        return NextResponse.json(
          {
            success: false,
            message: "Only the host can approve joining a tournament in progress",
          },
          { status: 403 }
        );
      }
    }

    // Check if max players reached (only for WAITING/STARTING tournaments)
    // IN_PROGRESS tournaments are checked above
    if (!isInProgress && session.participants.length >= session.maxPlayers) {
      return NextResponse.json(
        { success: false, message: "Tournament is full" },
        { status: 400 }
      );
    }

    let dbUser = null;
    if (user) {
      // Get or create user in database
      dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
      });
    }

    // Determine display name and check for duplicates
    let displayName: string;
    let userId: string | null = null;
    let hasAccount = false;

    if (dbUser) {
      // Authenticated user
      displayName =
        dbUser.username ||
        `${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim() ||
        "Player";
      userId = dbUser.id;
      hasAccount = true;
    } else {
      // Unauthenticated user with temporary name
      if (!temporaryName || temporaryName.trim().length === 0) {
        return NextResponse.json(
          { success: false, message: "Temporary name is required" },
          { status: 400 }
        );
      }
      displayName = temporaryName.trim();
      hasAccount = false;
    }

    // Check if user/name already in session
    const existingParticipant = session.participants.find(
      (p) =>
        (userId && p.userId === userId) ||
        (!userId && p.displayName.toLowerCase() === displayName.toLowerCase())
    );

    if (existingParticipant) {
      return NextResponse.json(
        {
          success: false,
          message: "You are already in this tournament",
        },
        { status: 400 }
      );
    }

    // Check if display name is already taken (case-insensitive)
    const nameTaken = session.participants.some(
      (p) => p.displayName.toLowerCase() === displayName.toLowerCase()
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
        userId: userId,
        temporaryName: hasAccount ? null : displayName,
        displayName: displayName,
        turnOrder: nextTurnOrder,
        isReady: false,
        hasAccount: hasAccount,
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

    return NextResponse.json({
      success: true,
      message: "Successfully joined tournament",
      participant: {
        id: participant.id,
        displayName: participant.displayName,
        turnOrder: participant.turnOrder,
        isReady: participant.isReady,
        hasAccount: participant.hasAccount,
        user: participant.user,
      },
    });
  } catch (error) {
    console.error("Error joining tournament:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

