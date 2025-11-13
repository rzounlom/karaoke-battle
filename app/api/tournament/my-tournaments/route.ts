import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { TournamentSessionStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
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

    // Get tournaments where user is host
    // Include expired tournaments so users can see them (they'll be marked as expired in UI)
    const hostedTournaments = await prisma.tournamentSession.findMany({
      where: {
        hostId: dbUser.id,
        status: {
          in: [
            TournamentSessionStatus.WAITING,
            TournamentSessionStatus.STARTING,
            TournamentSessionStatus.IN_PROGRESS,
          ],
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
          orderBy: {
            turnOrder: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get tournaments where user is a participant (but not host)
    // Include expired tournaments so users can see them (they'll be marked as expired in UI)
    const joinedTournaments = await prisma.tournamentSession.findMany({
      where: {
        participants: {
          some: {
            userId: dbUser.id,
          },
        },
        hostId: {
          not: dbUser.id, // Exclude tournaments where user is host
        },
        status: {
          in: [
            TournamentSessionStatus.WAITING,
            TournamentSessionStatus.STARTING,
            TournamentSessionStatus.IN_PROGRESS,
          ],
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
          orderBy: {
            turnOrder: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      hosted: hostedTournaments.map((session) => ({
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
        createdAt: session.createdAt,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
      })),
      joined: joinedTournaments.map((session) => ({
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
        createdAt: session.createdAt,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching user tournaments:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

