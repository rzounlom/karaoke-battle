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

    const session = await prisma.tournamentSession.findUnique({
      where: { sessionCode },
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

    // Only allow requests for IN_PROGRESS tournaments
    if (session.status !== "IN_PROGRESS") {
      return NextResponse.json(
        {
          success: false,
          message: "Join requests are only allowed for tournaments in progress",
        },
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

    // Get user info
    let dbUser = null;
    if (user) {
      dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
      });
    }

    // Determine display name
    let displayName: string;
    let userId: string | null = null;
    let hasAccount = false;

    if (dbUser) {
      displayName =
        dbUser.username ||
        `${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim() ||
        "Player";
      userId = dbUser.id;
      hasAccount = true;
    } else {
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

    // Check if display name is already taken
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

    // Broadcast join request to host via Ably
    await publishTournamentEvent(sessionCode, "join_request", {
      requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Simple unique ID
      displayName,
      userId,
      hasAccount,
      user: dbUser
        ? {
            id: dbUser.id,
            username: dbUser.username,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            avatar: dbUser.avatar,
          }
        : null,
      requestedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Join request sent to host",
    });
  } catch (error) {
    console.error("Error requesting to join tournament:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

