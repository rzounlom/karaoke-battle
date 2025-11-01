import { NextRequest, NextResponse } from "next/server";

import { ChallengeStatus } from "@prisma/client";
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

    // Get optional status filter from query params
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    // Build where clause for challenges
    const where: {
      OR: Array<
        | {
            challengerId: string;
            challengedId?: never;
          }
        | {
            challengedId: string;
            challengerId?: never;
          }
      >;
      status?: {
        in: ChallengeStatus[];
      };
    } = {
      OR: [{ challengerId: dbUser.id }, { challengedId: dbUser.id }],
    };

    // Apply status filter if provided
    if (statusFilter) {
      const statuses = statusFilter
        .split(",")
        .map((s) => s.trim())
        .filter((s) =>
          Object.values(ChallengeStatus).includes(s as ChallengeStatus)
        ) as ChallengeStatus[];
      if (statuses.length > 0) {
        where.status = { in: statuses };
      }
    }

    // Get all challenges for this user
    const challenges = await prisma.challenge.findMany({
      where,
      include: {
        challenger: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            level: true,
          },
        },
        challenged: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            level: true,
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Separate challenges into different categories
    const pendingReceived = challenges.filter(
      (c) => c.challengedId === dbUser.id && c.status === "PENDING"
    );
    const pendingSent = challenges.filter(
      (c) => c.challengerId === dbUser.id && c.status === "PENDING"
    );
    const active = challenges.filter(
      (c) =>
        (c.challengerId === dbUser.id || c.challengedId === dbUser.id) &&
        (c.status === "ACCEPTED" || c.status === "IN_PROGRESS")
    );
    const completed = challenges.filter(
      (c) =>
        (c.challengerId === dbUser.id || c.challengedId === dbUser.id) &&
        c.status === "COMPLETED"
    );
    const declined = challenges.filter(
      (c) =>
        (c.challengerId === dbUser.id || c.challengedId === dbUser.id) &&
        c.status === "DECLINED"
    );
    const expired = challenges.filter(
      (c) =>
        (c.challengerId === dbUser.id || c.challengedId === dbUser.id) &&
        c.status === "EXPIRED"
    );

    return NextResponse.json({
      success: true,
      challenges: challenges.map((c) => ({
        id: c.id,
        challenger: c.challenger,
        challenged: c.challenged,
        song: c.song,
        status: c.status,
        challengerScore: c.challengerScore,
        challengedScore: c.challengedScore,
        challengerCompletedAt: c.challengerCompletedAt,
        challengedCompletedAt: c.challengedCompletedAt,
        winner: c.winner,
        expiresAt: c.expiresAt,
        acceptedAt: c.acceptedAt,
        declinedAt: c.declinedAt,
        completedAt: c.completedAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      pendingReceived,
      pendingSent,
      active,
      completed,
      declined,
      expired,
    });
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
