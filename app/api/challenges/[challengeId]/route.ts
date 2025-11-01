import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { challengeId } = await params;

    if (!challengeId) {
      return NextResponse.json(
        { success: false, message: "Challenge ID is required" },
        { status: 400 }
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

    // Find the challenge with participants
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
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
    });

    if (!challenge) {
      return NextResponse.json(
        { success: false, message: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check if user is a participant
    const isParticipant = challenge.participants.some(
      (p) => p.userId === dbUser.id
    );

    if (!isParticipant) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not a participant in this challenge",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      challenge: {
        id: challenge.id,
        challenger: challenge.challenger,
        song: challenge.song,
        status: challenge.status,
        winner: challenge.winner,
        expiresAt: challenge.expiresAt,
        completedAt: challenge.completedAt,
        createdAt: challenge.createdAt,
        updatedAt: challenge.updatedAt,
        participants: challenge.participants.map((p) => ({
          id: p.id,
          userId: p.userId,
          user: p.user,
          status: p.status,
          score: p.score,
          acceptedAt: p.acceptedAt,
          declinedAt: p.declinedAt,
          completedAt: p.completedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching challenge:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

