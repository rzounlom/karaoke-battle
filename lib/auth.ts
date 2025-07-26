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
      await prisma.user.update({
        where: { clerkId: user.id },
        data: {
          email: user.emailAddresses[0]?.emailAddress || existingUser.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          avatar: user.imageUrl,
        },
      });
      return { success: true, message: "User updated", user: existingUser };
    } else {
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          clerkId: user.id,
          email: user.emailAddresses[0]?.emailAddress || "",
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          avatar: user.imageUrl,
        },
      });
      return { success: true, message: "User created", user: newUser };
    }
  } catch (error) {
    console.error("Error syncing user:", error);
    return { success: false, message: "Failed to sync user" };
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
