import { NextResponse } from "next/server";
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

    const body = await req.json();
    const { friendId, songId } = body;

    if (!friendId) {
      return NextResponse.json(
        { success: false, message: "Friend ID is required" },
        { status: 400 }
      );
    }

    if (!songId) {
      return NextResponse.json(
        { success: false, message: "Song ID is required" },
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

    // Check if trying to challenge self
    if (dbUser.id === friendId) {
      return NextResponse.json(
        { success: false, message: "Cannot challenge yourself" },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: friendId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "Target user not found" },
        { status: 404 }
      );
    }

    // Verify they are friends
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: dbUser.id, friendId: friendId, status: "ACCEPTED" },
          { userId: friendId, friendId: dbUser.id, status: "ACCEPTED" },
        ],
      },
    });

    if (!friendship) {
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

    // Check if there's already a pending challenge between these users for this song
    const existingChallenge = await prisma.challenge.findFirst({
      where: {
        OR: [
          {
            challengerId: dbUser.id,
            challengedId: friendId,
            songId: song.id,
            status: {
              in: ["PENDING", "ACCEPTED", "IN_PROGRESS"],
            },
          },
          {
            challengerId: friendId,
            challengedId: dbUser.id,
            songId: song.id,
            status: {
              in: ["PENDING", "ACCEPTED", "IN_PROGRESS"],
            },
          },
        ],
      },
    });

    if (existingChallenge) {
      return NextResponse.json(
        {
          success: false,
          message: "You already have an active challenge with this friend for this song",
        },
        { status: 400 }
      );
    }

    // Create new challenge
    const challenge = await prisma.challenge.create({
      data: {
        challengerId: dbUser.id,
        challengedId: friendId,
        songId: song.id,
        status: "PENDING",
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

    return NextResponse.json({
      success: true,
      message: "Challenge created successfully",
      challenge: {
        id: challenge.id,
        challenger: challenge.challenger,
        challenged: challenge.challenged,
        song: challenge.song,
        status: challenge.status,
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

