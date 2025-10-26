import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
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

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build search conditions
    const searchConditions = search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" as const } },
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    // Get users excluding current user
    const users = await prisma.user.findMany({
      where: {
        id: { not: dbUser.id },
        ...searchConditions,
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        level: true,
        experience: true,
        createdAt: true,
      },
      orderBy: search
        ? [{ level: "desc" }, { experience: "desc" }, { createdAt: "desc" }]
        : [{ level: "desc" }, { experience: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    });

    // Get existing friendships for these users
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: dbUser.id, friendId: { in: users.map((u) => u.id) } },
          { friendId: dbUser.id, userId: { in: users.map((u) => u.id) } },
        ],
      },
      select: {
        userId: true,
        friendId: true,
        status: true,
      },
    });

    // Create a map of friendship statuses
    const friendshipMap = new Map();
    friendships.forEach((friendship) => {
      const otherUserId =
        friendship.userId === dbUser.id
          ? friendship.friendId
          : friendship.userId;
      friendshipMap.set(otherUserId, friendship.status);
    });

    // Format the response
    const formattedUsers = users.map((user) => ({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      level: user.level,
      experience: user.experience,
      joinedAt: user.createdAt,
      friendshipStatus: friendshipMap.get(user.id) || null,
      displayName:
        user.username ||
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        "Unknown User",
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      total: formattedUsers.length,
      hasMore: formattedUsers.length === limit,
    });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
