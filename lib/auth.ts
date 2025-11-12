"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function syncUser() {
  try {
    const user = await currentUser();

    if (!user) {
      return { success: false, message: "No user found" };
    }

    // Check if user already exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    if (existingUser) {
      // Update existing user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        email: user.emailAddresses[0]?.emailAddress || existingUser.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.imageUrl,
      };

      // Only update username if our DB username is null and Clerk has a username
      if (!existingUser.username && user.username) {
        updateData.username = user.username;
      }

      await prisma.user.update({
        where: { clerkId: user.id },
        data: updateData,
      });
      return { success: true, message: "User updated", user: existingUser };
    } else {
      // Create new user
      const email = user.emailAddresses[0]?.emailAddress || "";
      const emailUsername = email.split("@")[0]; // Extract username from email

      const newUser = await prisma.user.create({
        data: {
          clerkId: user.id,
          email: email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username || emailUsername, // Use Clerk username or email-based username
          avatar: user.imageUrl,
        },
      });
      return { success: true, message: "User created", user: newUser };
    }
  } catch (error) {
    console.error("Error syncing user:", error);
    // Provide more detailed error message
    const errorMessage =
      error instanceof Error ? error.message : "Failed to sync user";
    return { success: false, message: errorMessage };
  }
}

export async function getCurrentUser() {
  try {
    const user = await currentUser();

    if (!user) {
      return null;
    }

    // Get user from our database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      include: {
        scores: {
          include: {
            song: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
        achievements: {
          include: {
            achievement: true,
          },
        },
      },
    });

    return dbUser;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}
