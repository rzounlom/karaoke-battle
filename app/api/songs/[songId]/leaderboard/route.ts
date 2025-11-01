import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ songId: string }> }
) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { songId } = await params;

    if (!songId) {
      return NextResponse.json(
        { success: false, message: "Song ID is required" },
        { status: 400 }
      );
    }

    // Find the song by customId
    const song = await prisma.song.findUnique({
      where: { customId: songId },
    });

    if (!song) {
      return NextResponse.json(
        { success: false, message: "Song not found" },
        { status: 404 }
      );
    }

    // Debug: Check ALL game sessions for this song (including abandoned and null scores)
    // This helps diagnose if sessions are being filtered out incorrectly
    const allSessionsDebug = await prisma.gameSession.findMany({
      where: {
        songId: song.id,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
          },
        },
      },
      orderBy: {
        score: "desc",
      },
    });
    
    // Only log in development or if there's a discrepancy
    if (process.env.NODE_ENV === "development") {
      console.log(`🔍 DEBUG: Total game sessions for ${song.customId}: ${allSessionsDebug.length}`);
      allSessionsDebug.forEach((s, i) => {
        console.log(`  ${i + 1}. User: ${s.user.username || s.userId}, Score: ${s.score}, Status: ${s.status}`);
      });
    }

    // Get all completed game sessions for this song
    // Sort by score and show top 10 scores (allowing multiple entries from same user)
    const gameSessions = await prisma.gameSession.findMany({
      where: {
        songId: song.id,
        status: "COMPLETED",
        score: {
          not: null,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            level: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        score: "desc",
      },
      take: 10, // Get top 10 scores
    });

    // Debug logging (development only)
    if (process.env.NODE_ENV === "development") {
      console.log(`📊 Found ${gameSessions.length} top game sessions for song ${song.customId} (${song.title})`);
      gameSessions.forEach((session, index) => {
        console.log(`${index + 1}. User: ${session.user.username || session.user.firstName || session.userId}, Score: ${session.score}, Status: ${session.status}`);
      });
    }

    // Map sessions to leaderboard entries (allowing multiple from same user)
    const leaderboard = gameSessions
      .filter((session) => session.score !== null)
      .map((session, index) => ({
        id: session.id, // Unique session ID for React keys
        rank: index + 1,
        userId: session.user.id,
        player: session.user.username || 
                `${session.user.firstName || ""} ${session.user.lastName || ""}`.trim() || 
                "Anonymous",
        score: session.score!,
        level: session.user.level,
        avatar: session.user.avatar,
      }));

    // Get current user's best score for this song
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    let userBestScore = null;
    if (dbUser) {
      // Get user's best session
      const userBestSession = await prisma.gameSession.findFirst({
        where: {
          userId: dbUser.id,
          songId: song.id,
          status: "COMPLETED",
          score: {
            not: null,
          },
        },
        orderBy: {
          score: "desc",
        },
      });

      if (userBestSession && userBestSession.score !== null) {
        // Get all sessions sorted by score to find user's rank
        const allSessionsRanked = await prisma.gameSession.findMany({
          where: {
            songId: song.id,
            status: "COMPLETED",
            score: {
              not: null,
            },
          },
          orderBy: {
            score: "desc",
          },
        });

        // Find user's rank (position in sorted list)
        // Count how many sessions have a better score than the user's best
        const betterScores = allSessionsRanked.filter(
          (s) => s.score !== null && s.score > userBestSession.score!
        ).length;
        
        userBestScore = {
          score: userBestSession.score,
          rank: betterScores + 1, // Rank is position (1-indexed)
        };
      }
    }

    // Count unique users for statistics
    const uniqueUsers = new Set(leaderboard.map((entry) => entry.userId));

    return NextResponse.json({
      success: true,
      leaderboard,
      userBestScore,
      totalPlayers: uniqueUsers.size,
      totalScores: leaderboard.length,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
