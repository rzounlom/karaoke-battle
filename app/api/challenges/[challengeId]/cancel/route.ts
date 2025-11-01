import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(
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
    });

    if (!challenge) {
      return NextResponse.json(
        { success: false, message: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check if the current user is the challenger
    if (challenge.challengerId !== dbUser.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Only the challenger can cancel a challenge",
        },
        { status: 403 }
      );
    }

    // Check if challenge can be cancelled (only if pending)
    if (challenge.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "Only pending challenges can be cancelled",
        },
        { status: 400 }
      );
    }

    // Update the challenge status
    const updatedChallenge = await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        status: "CANCELLED",
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
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Challenge cancelled successfully",
      challenge: {
        id: updatedChallenge.id,
        challenger: updatedChallenge.challenger,
        song: updatedChallenge.song,
        status: updatedChallenge.status,
        participants: updatedChallenge.participants.map((p) => ({
          id: p.id,
          userId: p.userId,
          user: p.user,
          status: p.status,
        })),
      },
    });
  } catch (error) {
    console.error("Error cancelling challenge:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

