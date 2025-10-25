import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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

    // Get recent game sessions with song details (both completed and abandoned)
    const recentSessions = await prisma.gameSession.findMany({
      where: {
        userId: dbUser.id,
        // Show both completed and abandoned songs
      },
      include: {
        song: true, // Include song details from database
      },
      orderBy: {
        endedAt: "desc",
      },
      take: 5, // Get the 5 most recent songs (completed and abandoned)
    });

    console.log(
      `📊 Found ${recentSessions.length} recent sessions for user ${dbUser.id}`
    );

    // Debug: Log the recent sessions with their endedAt timestamps
    console.log("🔍 Recent sessions debug:");
    recentSessions.forEach((session, index) => {
      console.log(
        `${index + 1}. ${session.song?.title} - ${session.endedAt} - Score: ${
          session.score
        } - Status: ${session.status}`
      );
    });

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
        song: session.song
          ? {
              id: session.song.customId || session.song.id, // Use customId if available, fallback to database id
              title: session.song.title,
              artist: session.song.artist,
              genre: session.song.genre,
              difficulty: session.song.difficulty,
            }
          : null,
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
