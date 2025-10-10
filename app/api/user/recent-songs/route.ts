import { NextRequest, NextResponse } from "next/server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
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

    // Get recent completed game sessions with song details
    const recentSessions = await prisma.gameSession.findMany({
      where: {
        userId: dbUser.id,
        status: "COMPLETED", // Only show completed songs, not abandoned ones
      },
      include: {
        // We need to get song details from our songs data since we're using static data
        // For now, we'll return the songId and let the frontend handle getting song details
      },
      orderBy: {
        endedAt: "desc",
      },
      take: 5, // Get the 5 most recent completed songs
    });

    console.log(
      `📊 Found ${recentSessions.length} recent completed sessions for user ${dbUser.id}`
    );

    // Get unique song IDs from recent sessions
    const songIds = [
      ...new Set(recentSessions.map((session) => session.songId)),
    ];

    return NextResponse.json({
      success: true,
      recentSessions: recentSessions.map((session) => ({
        id: session.id,
        songId: session.songId,
        gameMode: session.gameMode,
        status: session.status,
        score: session.score,
        completedAt: session.endedAt,
      })),
      songIds, // Frontend can use this to get song details
      totalSessions: recentSessions.length,
    });
  } catch (error) {
    console.error("Error fetching recent songs:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
