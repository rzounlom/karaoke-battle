import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // Get tournament session by code
    const session = await prisma.tournamentSession.findUnique({
      where: { sessionCode: code },
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
          orderBy: {
            turnOrder: "asc",
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

    // Check if session is already completed or cancelled
    if (session.status === "COMPLETED" || session.status === "CANCELLED") {
      return NextResponse.json(
        {
          success: false,
          message: `This tournament session is ${session.status.toLowerCase()}`,
        },
        { status: 410 }
      );
    }

    // Return session info (public data only)
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        sessionCode: session.sessionCode,
        name: session.name,
        status: session.status,
        maxPlayers: session.maxPlayers,
        currentPlayers: session.participants.length,
        host: {
          id: session.host.id,
          displayName:
            session.host.username ||
            `${session.host.firstName || ""} ${session.host.lastName || ""}`.trim() ||
            "Host",
          avatar: session.host.avatar,
        },
        participants: session.participants.map((p) => ({
          id: p.id,
          displayName: p.displayName,
          turnOrder: p.turnOrder,
          isReady: p.isReady,
          hasAccount: p.hasAccount,
          user: p.user,
        })),
        settings: session.settings,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching tournament session:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

