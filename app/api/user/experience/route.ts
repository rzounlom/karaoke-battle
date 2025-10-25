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
      pitch = 0, // Default to 0 since pitch scoring was removed
      songDifficulty = "MEDIUM",
      songId,
      gameEndReason = "completed",
    } = body;

    // Validate required fields
    if (
      typeof totalScore !== "number" ||
      typeof accuracy !== "number" ||
      typeof timing !== "number"
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid score data" },
        { status: 400 }
      );
    }

    // Handle cases where game ended without completion (abandoned sessions)
    // Still give minimal experience for attempting
    const isAbandoned =
      gameEndReason === "quit" ||
      gameEndReason === "abandoned" ||
      totalScore === 0;
    if (isAbandoned) {
      console.log(
        `🎮 Game abandoned - giving minimal experience. Score: ${totalScore}, Reason: ${gameEndReason}`
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
    let experienceResult;
    try {
      experienceResult = addExperience(
        dbUser.level,
        dbUser.experience,
        experienceGained
      );
    } catch (error) {
      console.error("Error calculating experience:", error);
      return NextResponse.json(
        { success: false, message: "Error calculating experience" },
        { status: 500 }
      );
    }

    // Debug logging
    console.log("Experience calculation debug:", {
      currentLevel: dbUser.level,
      currentExperience: dbUser.experience,
      experienceGained,
      newLevel: experienceResult.newLevel,
      newExperience: experienceResult.newExperience,
      newLevelType: typeof experienceResult.newLevel,
      newExperienceType: typeof experienceResult.newExperience,
    });

    // Validate experience values before database update
    if (
      typeof experienceResult.newLevel !== "number" ||
      typeof experienceResult.newExperience !== "number"
    ) {
      console.error("Invalid experience values:", {
        newLevel: experienceResult.newLevel,
        newExperience: experienceResult.newExperience,
        currentLevel: dbUser.level,
        currentExperience: dbUser.experience,
        experienceGained,
      });
      return NextResponse.json(
        { success: false, message: "Invalid experience calculation" },
        { status: 500 }
      );
    }

    // Update user in database with explicit value conversion and NaN protection
    const safeLevel = Math.floor(Number(experienceResult.newLevel)) || 1;
    const safeExperience =
      Math.floor(Number(experienceResult.newExperience)) || 0;

    // Final NaN check
    if (isNaN(safeLevel) || isNaN(safeExperience)) {
      console.error("NaN values detected in database update:", {
        safeLevel,
        safeExperience,
        originalNewLevel: experienceResult.newLevel,
        originalNewExperience: experienceResult.newExperience,
      });
      return NextResponse.json(
        { success: false, message: "Invalid experience values detected" },
        { status: 500 }
      );
    }

    const updateData = {
      level: safeLevel,
      experience: safeExperience,
    };

    console.log("Database update data:", updateData);

    await prisma.user.update({
      where: { id: dbUser.id },
      data: updateData,
    });

    // Save the score to database (only if songId is valid)
    let song = null;
    if (songId) {
      try {
        console.log(`🔍 Looking up song with customId: ${songId}`);

        // First check if the song exists (lookup by customId)
        song = await prisma.song.findUnique({
          where: { customId: songId },
        });

        if (!song) {
          console.error(`❌ Song not found with customId: ${songId}`);

          // Try to find all songs to debug
          const allSongs = await prisma.song.findMany({
            select: { customId: true, title: true, artist: true },
          });
          console.log(`📋 Available songs in database:`, allSongs);

          // Continue without creating score record, but still update experience
        } else {
          await prisma.score.create({
            data: {
              userId: dbUser.id,
              songId: song.id, // Use the database song ID, not the customId
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
        }
      } catch (error) {
        console.error("Error creating score record:", error);
        // Continue without creating score record, but still update experience
      }

      // Create a GameSession record to track the game (only if song exists)
      if (song) {
        const gameStatus =
          gameEndReason === "completed" ? "COMPLETED" : "ABANDONED";
        console.log(
          `🎮 Creating GameSession: ${gameStatus} for song ${songId} with score ${Math.round(
            totalScore
          )}`
        );

        try {
          const gameSession = await prisma.gameSession.create({
            data: {
              userId: dbUser.id,
              songId: song.id, // Use the database song ID, not the customId
              gameMode: "SINGLE_PLAYER",
              status: gameStatus,
              endedAt: new Date(),
              score: Math.round(totalScore),
            },
          });
          console.log(`✅ GameSession created successfully:`, {
            id: gameSession.id,
            songId: gameSession.songId,
            status: gameSession.status,
            score: gameSession.score,
            endedAt: gameSession.endedAt,
          });
        } catch (error) {
          console.error("❌ Error creating GameSession record:", error);
          // Continue without creating GameSession record
        }
      }
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
