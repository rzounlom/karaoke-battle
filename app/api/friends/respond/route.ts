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
    const { friendshipId, action } = body; // action: "accept" or "reject"

    if (!friendshipId || !action) {
      return NextResponse.json(
        { success: false, message: "Friendship ID and action are required" },
        { status: 400 }
      );
    }

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Action must be 'accept' or 'reject'" },
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

    // Find the friendship request
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        friend: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!friendship) {
      return NextResponse.json(
        { success: false, message: "Friend request not found" },
        { status: 404 }
      );
    }

    // Check if the current user is the recipient of the request
    if (friendship.friendId !== dbUser.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You can only respond to requests sent to you",
        },
        { status: 403 }
      );
    }

    // Check if the request is still pending
    if (friendship.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "This friend request has already been responded to",
        },
        { status: 400 }
      );
    }

    // Update the friendship status
    const newStatus = action === "accept" ? "ACCEPTED" : "REJECTED";

    const updatedFriendship = await prisma.friendship.update({
      where: { id: friendshipId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    const senderName =
      friendship.user.username ||
      `${friendship.user.firstName || ""} ${
        friendship.user.lastName || ""
      }`.trim() ||
      "Unknown User";

    return NextResponse.json({
      success: true,
      message:
        action === "accept"
          ? `You are now friends with ${senderName}!`
          : `Friend request from ${senderName} has been rejected`,
      friendship: {
        id: updatedFriendship.id,
        status: updatedFriendship.status,
        sender: friendship.user,
        recipient: friendship.friend,
      },
    });
  } catch (error) {
    console.error("Error responding to friend request:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
