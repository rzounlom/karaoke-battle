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

    if (!challenge) {
      return NextResponse.json(
        { success: false, message: "Challenge not found" },
        { status: 404 }
      );
    }

    // Find the participant record for current user
    const participant = challenge.participants.find(
      (p) => p.userId === dbUser.id
    );

    if (!participant) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not a participant in this challenge",
        },
        { status: 403 }
      );
    }

    // Can't decline if already accepted or completed
    if (participant.status === "ACCEPTED") {
      return NextResponse.json(
        {
          success: false,
          message: "You have already accepted this challenge",
        },
        { status: 400 }
      );
    }

    // Check if already declined
    if (participant.status === "DECLINED") {
      return NextResponse.json(
        {
          success: false,
          message: "You have already declined this challenge",
        },
        { status: 400 }
      );
    }

    // Update participant status to DECLINED
    await prisma.challengeParticipant.update({
      where: { id: participant.id },
      data: {
        status: "DECLINED",
        declinedAt: new Date(),
      },
    });

    // Fetch updated challenge
    const updatedChallenge = await prisma.challenge.findUnique({
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

    const challengerName =
      challenge.challenger.username ||
      `${challenge.challenger.firstName || ""} ${challenge.challenger.lastName || ""}`.trim() ||
      "Unknown User";

    return NextResponse.json({
      success: true,
      message: `Challenge from ${challengerName} has been declined`,
      challenge: {
        id: updatedChallenge!.id,
        challenger: updatedChallenge!.challenger,
        song: updatedChallenge!.song,
        status: updatedChallenge!.status,
        participants: updatedChallenge!.participants.map((p) => ({
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
    console.error("Error declining challenge:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

