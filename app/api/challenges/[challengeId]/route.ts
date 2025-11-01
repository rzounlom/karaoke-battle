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

    // Find the challenge
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
    });

    if (!challenge) {
      return NextResponse.json(
        { success: false, message: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check if user is a participant
    const isParticipant =
      challenge.challengerId === dbUser.id ||
      challenge.challengedId === dbUser.id;

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
        challenged: challenge.challenged,
        song: challenge.song,
        status: challenge.status,
        challengerScore: challenge.challengerScore,
        challengedScore: challenge.challengedScore,
        challengerCompletedAt: challenge.challengerCompletedAt,
        challengedCompletedAt: challenge.challengedCompletedAt,
        winner: challenge.winner,
        expiresAt: challenge.expiresAt,
        acceptedAt: challenge.acceptedAt,
        declinedAt: challenge.declinedAt,
        completedAt: challenge.completedAt,
        createdAt: challenge.createdAt,
        updatedAt: challenge.updatedAt,
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

