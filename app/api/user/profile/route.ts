import { NextRequest, NextResponse } from "next/server";

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
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        level: true,
        experience: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: dbUser,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { username } = body;

    // Validate input
    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { success: false, message: "Username is required" },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();

    // Validate username format (no special characters)
    const specialCharRegex = /[^a-zA-Z0-9\s\-]/;
    if (specialCharRegex.test(trimmedUsername)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Username can only contain letters, numbers, spaces, and hyphens",
        },
        { status: 400 }
      );
    }

    // Validate length
    if (trimmedUsername.length < 2) {
      return NextResponse.json(
        { success: false, message: "Username must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (trimmedUsername.length > 30) {
      return NextResponse.json(
        { success: false, message: "Username must be less than 30 characters" },
        { status: 400 }
      );
    }

    // Check if username is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        username: trimmedUsername,
        clerkId: { not: user.id }, // Exclude current user
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "This username is already taken" },
        { status: 400 }
      );
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { clerkId: user.id },
      data: { username: trimmedUsername },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        level: true,
        experience: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
