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
    // Find challenges where user is a participant
    const where: {
      participants: {
        some: {
          userId: string;
        };
      };
      status?: {
        in: ChallengeStatus[];
      };
    } = {
      participants: {
        some: {
          userId: dbUser.id,
        },
      },
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
                level: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get user's participant status for each challenge
    const challengesWithUserStatus = challenges.map((challenge) => {
      const userParticipant = challenge.participants.find(
        (p) => p.userId === dbUser.id
      );
      const isChallenger = challenge.challengerId === dbUser.id;
      const userParticipantStatus = userParticipant?.status || "PENDING";

      return {
        ...challenge,
        userParticipantStatus,
        isChallenger,
      };
    });

    // Separate challenges into different categories
    const pendingReceived = challengesWithUserStatus.filter(
      (c) => !c.isChallenger && c.userParticipantStatus === "PENDING" && c.status === "PENDING"
    );
    const pendingSent = challengesWithUserStatus.filter(
      (c) => c.isChallenger && c.status === "PENDING"
    );
    const active = challengesWithUserStatus.filter(
      (c) =>
        (c.status === "ACCEPTED" || c.status === "IN_PROGRESS") &&
        c.userParticipantStatus === "ACCEPTED"
    );
    const completed = challengesWithUserStatus.filter(
      (c) => c.status === "COMPLETED"
    );
    const declined = challengesWithUserStatus.filter(
      (c) => c.userParticipantStatus === "DECLINED"
    );
    const expired = challengesWithUserStatus.filter(
      (c) => c.status === "EXPIRED"
    );

    return NextResponse.json({
      success: true,
      challenges: challenges.map((c) => ({
        id: c.id,
        challenger: c.challenger,
        song: c.song,
        status: c.status,
        winner: c.winner,
        expiresAt: c.expiresAt,
        completedAt: c.completedAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        participants: c.participants.map((p) => ({
          id: p.id,
          userId: p.userId,
          user: p.user,
          status: p.status,
          score: p.score,
          acceptedAt: p.acceptedAt,
          declinedAt: p.declinedAt,
          completedAt: p.completedAt,
        })),
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
