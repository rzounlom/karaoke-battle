import { NextResponse } from "next/server";
import { ParticipantStatus } from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
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

    const body = await req.json();
    const { friendIds, songId } = body;

    // Support both old format (friendId) and new format (friendIds array)
    const friendIdsArray = friendIds
      ? Array.isArray(friendIds)
        ? friendIds
        : [friendIds]
      : body.friendId
      ? [body.friendId]
      : null;

    if (!friendIdsArray || friendIdsArray.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one friend ID is required" },
        { status: 400 }
      );
    }

    // Remove duplicates and self
    const uniqueFriendIds = [
      ...new Set(friendIdsArray.filter((id: string) => id !== dbUser.id)),
    ];

    if (uniqueFriendIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "You must challenge at least one other friend",
        },
        { status: 400 }
      );
    }

    if (!songId) {
      return NextResponse.json(
        { success: false, message: "Song ID is required" },
        { status: 400 }
      );
    }

    // Verify all target users exist and are friends
    const targetUsers = await prisma.user.findMany({
      where: {
        id: {
          in: uniqueFriendIds,
        },
      },
    });

    if (targetUsers.length !== uniqueFriendIds.length) {
      return NextResponse.json(
        { success: false, message: "One or more target users not found" },
        { status: 404 }
      );
    }

    // Verify all are friends
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: uniqueFriendIds.flatMap((friendId: string) => [
          { userId: dbUser.id, friendId: friendId, status: "ACCEPTED" },
          { userId: friendId, friendId: dbUser.id, status: "ACCEPTED" },
        ]),
      },
    });

    // Check if all friends are in the friendships list
    const friendIdsFromFriendships = new Set(
      friendships.flatMap((f) => [f.userId, f.friendId])
    );

    const allAreFriends = uniqueFriendIds.every(
      (friendId: string) =>
        friendIdsFromFriendships.has(friendId) &&
        friendIdsFromFriendships.has(dbUser.id)
    );

    if (!allAreFriends) {
      return NextResponse.json(
        { success: false, message: "You can only challenge your friends" },
        { status: 400 }
      );
    }

    // Check if song exists (by customId, which is what we use in the app)
    const song = await prisma.song.findUnique({
      where: { customId: songId },
    });

    if (!song) {
      return NextResponse.json(
        { success: false, message: "Song not found" },
        { status: 404 }
      );
    }

    // Check if there's already an active challenge with the same participants for this song
    // Get all challenge IDs where the user is a participant
    const userChallenges = await prisma.challengeParticipant.findMany({
      where: {
        userId: dbUser.id,
        challenge: {
          songId: song.id,
          status: {
            in: ["PENDING", "ACCEPTED", "IN_PROGRESS"],
          },
        },
      },
      include: {
        challenge: {
          include: {
            participants: true,
          },
        },
      },
    });

    // Check if any existing challenge has the exact same set of participants
    for (const userChallenge of userChallenges) {
      const existingParticipantIds = new Set(
        userChallenge.challenge.participants.map((p) => p.userId)
      );
      const newParticipantIds = new Set([dbUser.id, ...uniqueFriendIds]);

      // Check if sets are equal
      if (
        existingParticipantIds.size === newParticipantIds.size &&
        [...existingParticipantIds].every((id) => newParticipantIds.has(id))
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You already have an active challenge with these friends for this song",
          },
          { status: 400 }
        );
      }
    }

    // Create new challenge with participants
    const challenge = await prisma.challenge.create({
      data: {
        challengerId: dbUser.id,
        songId: song.id,
        status: "PENDING",
        participants: {
          create: [
            // Challenger is auto-accepted
            {
              userId: dbUser.id,
              status: ParticipantStatus.ACCEPTED,
              acceptedAt: new Date(),
            },
            // Other participants start as PENDING
            ...uniqueFriendIds.map((friendId: string) => ({
              userId: friendId,
              status: ParticipantStatus.PENDING,
            })),
          ],
        },
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
      message: `Challenge created successfully! Sent to ${
        uniqueFriendIds.length
      } friend${uniqueFriendIds.length > 1 ? "s" : ""}.`,
      challenge: {
        id: challenge.id,
        challenger: challenge.challenger,
        song: challenge.song,
        status: challenge.status,
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
        createdAt: challenge.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating challenge:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
