import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generateUniqueSessionCode, createTournamentJoinUrl } from "@/lib/tournament-utils";
import { TournamentSessionStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get current user from database
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
    const { name, maxPlayers, settings } = body;

    // Validate input
    const validatedMaxPlayers = Math.min(
      Math.max(parseInt(maxPlayers) || 8, 2),
      32
    ); // Between 2 and 32 players

    // Default settings
    const defaultSettings = {
      rounds: 1, // Each player plays once by default
      turnTimeLimit: 300, // 5 minutes per turn (gameplay time)
      songSelectionTimeLimit: 60, // 60 seconds to select a song
    };

    const tournamentSettings = {
      ...defaultSettings,
      ...(settings || {}),
    };

    // Generate unique session code
    const sessionCode = await generateUniqueSessionCode(6);

    // Set expiration (2 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);

    // Get host display name
    const hostDisplayName =
      dbUser.username ||
      `${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim() ||
      "Host";

    // Create tournament session with host as first participant
    const session = await prisma.tournamentSession.create({
      data: {
        sessionCode,
        hostId: dbUser.id,
        name: name || null,
        maxPlayers: validatedMaxPlayers,
        status: TournamentSessionStatus.WAITING,
        settings: tournamentSettings,
        expiresAt,
        participants: {
          create: {
            userId: dbUser.id,
            displayName: hostDisplayName,
            turnOrder: 1,
            isReady: false,
            hasAccount: true,
            temporaryName: null,
          },
        },
      },
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
        },
      },
    });

    const joinUrl = createTournamentJoinUrl(sessionCode);

    return NextResponse.json({
      success: true,
      message: "Tournament session created successfully",
      session: {
        id: session.id,
        sessionCode: session.sessionCode,
        name: session.name,
        joinUrl,
        status: session.status,
        maxPlayers: session.maxPlayers,
        currentPlayers: session.participants.length,
        host: session.host,
        participants: session.participants.map((p) => ({
          id: p.id,
          displayName: p.displayName,
          turnOrder: p.turnOrder,
          isReady: p.isReady,
          user: p.user,
        })),
        settings: session.settings,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating tournament session:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

