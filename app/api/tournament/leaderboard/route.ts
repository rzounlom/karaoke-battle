import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionCode = searchParams.get("sessionCode");

    if (!sessionCode) {
      return NextResponse.json(
        { success: false, message: "Session code is required" },
        { status: 400 }
      );
    }

    // Get tournament session
    const session = await prisma.tournamentSession.findUnique({
      where: { sessionCode },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Tournament session not found" },
        { status: 404 }
      );
    }

    // Get all participants sorted by total score (descending)
    const participants = await prisma.tournamentParticipant.findMany({
      where: { sessionId: session.id },
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
      orderBy: { totalScore: "desc" },
    });

    return NextResponse.json({
      success: true,
      leaderboard: participants.map((p, index) => ({
        rank: index + 1,
        id: p.id,
        displayName: p.displayName,
        totalScore: p.totalScore,
        turnOrder: p.turnOrder,
        hasAccount: p.hasAccount,
        user: p.user,
      })),
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

