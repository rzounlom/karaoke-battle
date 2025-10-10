import { NextRequest, NextResponse } from "next/server";
import {
  addExperience,
  calculateExperienceFromScore,
  getLevelInfo,
} from "@/lib/experience";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      totalScore,
      accuracy,
      timing,
      pitch,
      songDifficulty = "MEDIUM",
      songId,
    } = body;

    // Validate required fields
    if (
      typeof totalScore !== "number" ||
      typeof accuracy !== "number" ||
      typeof timing !== "number" ||
      typeof pitch !== "number"
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid score data" },
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

    // Calculate experience gained
    const experienceGained = calculateExperienceFromScore(
      totalScore,
      accuracy,
      timing,
      pitch,
      songDifficulty
    );

    // Calculate new level and experience
    const experienceResult = addExperience(
      dbUser.level,
      dbUser.experience,
      experienceGained
    );

    // Update user in database
    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        level: experienceResult.newLevel,
        experience: experienceResult.newExperience,
      },
    });

    // Save the score to database
    if (songId) {
      await prisma.score.create({
        data: {
          userId: dbUser.id,
          songId: songId,
          totalScore: Math.round(totalScore),
          accuracy: accuracy,
          timing: timing,
          pitch: pitch,
          lyrics: 0, // Not used in current system
          perfectNotes: 0, // Not used in current system
          currentStreak: 0, // Not used in current system
          maxStreak: 0, // Not used in current system
          gameMode: "SINGLE_PLAYER",
        },
      });

      // Create a GameSession record to track the completed game
      await prisma.gameSession.create({
        data: {
          userId: dbUser.id,
          songId: songId,
          gameMode: "SINGLE_PLAYER",
          status: "COMPLETED",
          endedAt: new Date(),
          score: Math.round(totalScore),
        },
      });
    }

    // Get updated level info
    const levelInfo = getLevelInfo(
      experienceResult.newLevel,
      experienceResult.newExperience
    );

    return NextResponse.json({
      success: true,
      experienceGained,
      leveledUp: experienceResult.leveledUp,
      newLevel: experienceResult.newLevel,
      newExperience: experienceResult.newExperience,
      levelInfo,
      message: experienceResult.leveledUp
        ? `Level up! You're now level ${experienceResult.newLevel}!`
        : `Gained ${experienceGained} experience points!`,
    });
  } catch (error) {
    console.error("Error updating user experience:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    // Get level info
    const levelInfo = getLevelInfo(dbUser.level, dbUser.experience);

    return NextResponse.json({
      success: true,
      level: dbUser.level,
      experience: dbUser.experience,
      levelInfo,
    });
  } catch (error) {
    console.error("Error getting user experience:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
