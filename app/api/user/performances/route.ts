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

    // Get query params for pagination and filtering
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const type = searchParams.get("type"); // "scores" | "battles" | "all"

    // Fetch user's scores
    const scores = await prisma.score.findMany({
      where: { userId: dbUser.id },
      include: {
        song: {
          select: {
            id: true,
            customId: true,
            title: true,
            artist: true,
            thumbnail: true,
            difficulty: true,
          },
        },
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
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    // Fetch user's completed challenges (battles)
    const challenges = await prisma.challenge.findMany({
      where: {
        participants: {
          some: {
            userId: dbUser.id,
          },
        },
        status: {
          in: ["COMPLETED", "EXPIRED"],
        },
      },
      include: {
        challenger: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        song: {
          select: {
            id: true,
            customId: true,
            title: true,
            artist: true,
            thumbnail: true,
            difficulty: true,
          },
        },
        winner: {
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
          orderBy: [
            { score: "desc" },
            { completedAt: "asc" },
          ],
        },
      },
      orderBy: { completedAt: "desc" },
      take: limit,
      skip: offset,
    });

    // Format scores for response
    const formattedScores = scores.map((score) => ({
      id: score.id,
      type: "score" as const,
      song: score.song,
      totalScore: score.totalScore,
      accuracy: score.accuracy,
      timing: score.timing,
      pitch: score.pitch,
      lyrics: score.lyrics,
      perfectNotes: score.perfectNotes,
      currentStreak: score.currentStreak,
      maxStreak: score.maxStreak,
      gameMode: score.gameMode,
      createdAt: score.createdAt,
    }));

    // Format challenges for response
    const formattedChallenges = challenges.map((challenge) => {
      const userParticipant = challenge.participants.find(
        (p) => p.userId === dbUser.id
      );
      const isWinner = challenge.winnerId === dbUser.id;
      const userRank = challenge.participants
        .filter((p) => p.score !== null)
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .findIndex((p) => p.userId === dbUser.id) + 1;

      return {
        id: challenge.id,
        type: "battle" as const,
        song: challenge.song,
        status: challenge.status,
        isWinner,
        userRank,
        totalParticipants: challenge.participants.filter(
          (p) => p.status === "ACCEPTED"
        ).length,
        userScore: userParticipant?.score || null,
        winner: challenge.winner,
        participants: challenge.participants
          .filter((p) => p.status === "ACCEPTED")
          .map((p) => ({
            id: p.id,
            user: p.user,
            score: p.score,
            completedAt: p.completedAt,
          }))
          .sort((a, b) => (b.score || 0) - (a.score || 0)),
        completedAt: challenge.completedAt,
        createdAt: challenge.createdAt,
      };
    });

    // Combine and sort by date
    let allResults: (typeof formattedScores[0] | typeof formattedChallenges[0])[] = [];
    
    if (type === "scores") {
      allResults = formattedScores;
    } else if (type === "battles") {
      allResults = formattedChallenges;
    } else {
      allResults = [...formattedScores, ...formattedChallenges].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return NextResponse.json({
      success: true,
      results: allResults.slice(0, limit),
      total: allResults.length,
      hasMore: allResults.length > limit,
    });
  } catch (error) {
    console.error("Error fetching user performances:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

