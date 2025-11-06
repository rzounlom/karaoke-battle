import { NextRequest, NextResponse } from "next/server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { processExpiredChallenges } from "@/lib/challenge-expiration";

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

    // Process expired challenges before handling acceptance
    // This ensures expired challenges are handled when users interact with challenges
    processExpiredChallenges().catch((error) => {
      console.error("Error processing expired challenges:", error);
      // Don't fail the request if expiration check fails
    });

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

    // Check if already accepted
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

    // Check if challenge is cancelled
    if (challenge.status === "CANCELLED") {
      return NextResponse.json(
        {
          success: false,
          message: "This challenge has been cancelled",
        },
        { status: 400 }
      );
    }

    // Update participant status to ACCEPTED
    await prisma.challengeParticipant.update({
      where: { id: participant.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    // Check if this is the first acceptance (besides challenger who is auto-accepted)
    // If challenge is still PENDING and this is first acceptance, activate the challenge
    const acceptedParticipants = challenge.participants.filter(
      (p) => p.status === "ACCEPTED"
    );

    let updatedChallenge;
    if (challenge.status === "PENDING" && acceptedParticipants.length === 1) {
      // This is the first acceptance - activate challenge
      // Set completion deadline: 24 hours from acceptance
      const completionDeadline = new Date();
      completionDeadline.setHours(completionDeadline.getHours() + 24);

      updatedChallenge = await prisma.challenge.update({
        where: { id: challengeId },
        data: {
          status: "ACCEPTED",
          expiresAt: completionDeadline, // 24 hours to complete the battle
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
    } else {
      // Challenge already active or others accepted, just fetch updated data
      updatedChallenge = await prisma.challenge.findUnique({
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
    }

    return NextResponse.json({
      success: true,
      message: `Challenge accepted! You have 24 hours to complete "${challenge.song.title}"`,
      challenge: {
        id: updatedChallenge!.id,
        challenger: updatedChallenge!.challenger,
        song: updatedChallenge!.song,
        status: updatedChallenge!.status,
        expiresAt: updatedChallenge!.expiresAt,
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
    console.error("Error accepting challenge:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
