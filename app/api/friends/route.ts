import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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

    // Get all friendships for this user (both sent and received)
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userId: dbUser.id }, { friendId: dbUser.id }],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            level: true,
            experience: true,
          },
        },
        friend: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            level: true,
            experience: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Separate into different categories
    const acceptedFriends = friendships.filter((f) => f.status === "ACCEPTED");
    const pendingSent = friendships.filter(
      (f) => f.status === "PENDING" && f.userId === dbUser.id
    );
    const pendingReceived = friendships.filter(
      (f) => f.status === "PENDING" && f.friendId === dbUser.id
    );

    // Format the response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatFriend = (friendship: any, isUser: boolean) => {
      const friendData = isUser ? friendship.friend : friendship.user;
      return {
        id: friendship.id,
        friendId: friendData.id,
        username: friendData.username,
        firstName: friendData.firstName,
        lastName: friendData.lastName,
        avatar: friendData.avatar,
        level: friendData.level,
        experience: friendData.experience,
        status: friendship.status,
        createdAt: friendship.createdAt,
        isReceived: !isUser,
      };
    };

    const response = {
      success: true,
      acceptedFriends: acceptedFriends.map((f) =>
        formatFriend(f, f.userId === dbUser.id)
      ),
      pendingSent: pendingSent.map((f) => formatFriend(f, true)),
      pendingReceived: pendingReceived.map((f) => formatFriend(f, false)),
      totalFriends: acceptedFriends.length,
      pendingRequestsCount: pendingReceived.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching friends:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
