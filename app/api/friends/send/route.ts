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
    const { friendId } = body;

    if (!friendId) {
      return NextResponse.json(
        { success: false, message: "Friend ID is required" },
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

    // Check if trying to add self as friend
    if (dbUser.id === friendId) {
      return NextResponse.json(
        { success: false, message: "Cannot add yourself as a friend" },
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

    // Check if friendship already exists
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: dbUser.id, friendId: friendId },
          { userId: friendId, friendId: dbUser.id },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === "ACCEPTED") {
        return NextResponse.json(
          { success: false, message: "You are already friends" },
          { status: 400 }
        );
      } else if (existingFriendship.status === "PENDING") {
        return NextResponse.json(
          { success: false, message: "Friend request already pending" },
          { status: 400 }
        );
      } else if (existingFriendship.status === "REJECTED") {
        // Allow sending a new request after rejection
        await prisma.friendship.update({
          where: { id: existingFriendship.id },
          data: {
            status: "PENDING",
            userId: dbUser.id,
            friendId: friendId,
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          message: "Friend request sent successfully",
          friendshipId: existingFriendship.id,
        });
      }
    }

    // Create new friendship request
    const friendship = await prisma.friendship.create({
      data: {
        userId: dbUser.id,
        friendId: friendId,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Friend request sent successfully",
      friendshipId: friendship.id,
    });
  } catch (error) {
    console.error("Error sending friend request:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
