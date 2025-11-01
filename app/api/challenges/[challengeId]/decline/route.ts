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
        challenged: {
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
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { success: false, message: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check if the current user is the challenged user
    if (challenge.challengedId !== dbUser.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You can only decline challenges sent to you",
        },
        { status: 403 }
      );
    }

    // Check if the challenge is still pending
    if (challenge.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "This challenge has already been responded to",
        },
        { status: 400 }
      );
    }

    // Update the challenge status
    const updatedChallenge = await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        status: "DECLINED",
        declinedAt: new Date(),
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
        challenged: {
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
      },
    });

    const challengerName =
      challenge.challenger.username ||
      `${challenge.challenger.firstName || ""} ${challenge.challenger.lastName || ""}`.trim() ||
      "Unknown User";

    return NextResponse.json({
      success: true,
      message: `Challenge from ${challengerName} has been declined`,
      challenge: {
        id: updatedChallenge.id,
        challenger: updatedChallenge.challenger,
        challenged: updatedChallenge.challenged,
        song: updatedChallenge.song,
        status: updatedChallenge.status,
        declinedAt: updatedChallenge.declinedAt,
      },
    });
  } catch (error) {
    console.error("Error declining challenge:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

