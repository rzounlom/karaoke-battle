/**
 * Experience and Level System
 * Handles user leveling, experience calculation, and level-up logic
 */

export interface ExperienceResult {
  experienceGained: number;
  newLevel: number;
  newExperience: number;
  leveledUp: boolean;
  experienceToNext: number;
}

export interface LevelInfo {
  level: number;
  experience: number;
  experienceToNext: number;
  totalExperienceForLevel: number;
}

/**
 * Calculate experience points from game performance
 */
export function calculateExperienceFromScore(
  totalScore: number,
  accuracy: number,
  timing: number,
  pitch: number,
  songDifficulty: "EASY" | "MEDIUM" | "HARD" = "MEDIUM"
): number {
  // Validate and sanitize inputs
  const safeTotalScore = Math.max(0, Math.min(100, Number(totalScore) || 0));
  const safeAccuracy = Math.max(0, Math.min(100, Number(accuracy) || 0));
  const safeTiming = Math.max(0, Math.min(100, Number(timing) || 0));
  const safePitch = Math.max(0, Math.min(100, Number(pitch) || 0));

  // Log if any inputs were invalid
  if (isNaN(totalScore) || isNaN(accuracy) || isNaN(timing) || isNaN(pitch)) {
    console.error("Invalid score inputs to calculateExperienceFromScore:", {
      totalScore,
      accuracy,
      timing,
      pitch,
      songDifficulty,
    });
  }

  // Base experience from total score (0-100 scale)
  const baseExperience = Math.floor(safeTotalScore * 0.5); // 0-50 base XP

  // Performance bonuses
  const accuracyBonus = Math.floor(safeAccuracy * 0.3); // 0-30 bonus
  const timingBonus = Math.floor(safeTiming * 0.2); // 0-20 bonus
  const pitchBonus = Math.floor(safePitch * 0.2); // 0-20 bonus

  // Difficulty multiplier
  const difficultyMultiplier =
    {
      EASY: 0.8,
      MEDIUM: 1.0,
      HARD: 1.3,
    }[songDifficulty] || 1.0;

  // Perfect performance bonus (all scores > 90%)
  const perfectBonus =
    safeAccuracy > 90 && safeTiming > 90 && safePitch > 90 ? 25 : 0;

  // Calculate total experience
  const totalExperience = Math.floor(
    (baseExperience + accuracyBonus + timingBonus + pitchBonus + perfectBonus) *
      difficultyMultiplier
  );

  // Ensure we never return NaN
  const result = Math.max(1, Math.min(150, totalExperience));

  if (isNaN(result)) {
    console.error("NaN result in calculateExperienceFromScore:", {
      totalScore: safeTotalScore,
      accuracy: safeAccuracy,
      timing: safeTiming,
      pitch: safePitch,
      baseExperience,
      accuracyBonus,
      timingBonus,
      pitchBonus,
      perfectBonus,
      difficultyMultiplier,
      totalExperience,
    });
    return 1; // Fallback to minimum experience
  }

  return result;
}

/**
 * Calculate total experience required for a specific level
 */
export function getExperienceForLevel(level: number): number {
  if (level <= 1) return 0;

  // Exponential growth: each level requires more XP
  // Level 2: 100 XP, Level 3: 250 XP, Level 4: 450 XP, etc.
  return Math.floor(50 * Math.pow(level - 1, 1.5));
}

/**
 * Calculate level from total experience
 */
export function getLevelFromExperience(totalExperience: number): number {
  // Ensure totalExperience is a valid number
  if (
    typeof totalExperience !== "number" ||
    isNaN(totalExperience) ||
    totalExperience < 0
  ) {
    console.error(
      "Invalid totalExperience in getLevelFromExperience:",
      totalExperience
    );
    return 1; // Default to level 1 for invalid input
  }

  let level = 1;
  let requiredXP = 0;

  while (requiredXP <= totalExperience) {
    level++;
    requiredXP = getExperienceForLevel(level);
  }

  // Ensure level is at least 1
  return Math.max(1, level - 1);
}

/**
 * Get experience needed for next level
 */
export function getExperienceToNextLevel(
  currentLevel: number,
  currentExperience: number
): number {
  const nextLevelXP = getExperienceForLevel(currentLevel + 1);
  return Math.max(0, nextLevelXP - currentExperience);
}

/**
 * Calculate level info for a user
 */
export function getLevelInfo(level: number, experience: number): LevelInfo {
  const totalXPForCurrentLevel = getExperienceForLevel(level);
  const totalXPForNextLevel = getExperienceForLevel(level + 1);
  const experienceToNext = Math.max(0, totalXPForNextLevel - experience);

  return {
    level,
    experience,
    experienceToNext,
    totalExperienceForLevel: totalXPForCurrentLevel,
  };
}

/**
 * Add experience and check for level up
 */
export function addExperience(
  currentLevel: number,
  currentExperience: number,
  experienceGained: number
): ExperienceResult {
  // Validate inputs
  if (
    typeof currentLevel !== "number" ||
    typeof currentExperience !== "number" ||
    typeof experienceGained !== "number"
  ) {
    console.error("Invalid experience calculation inputs:", {
      currentLevel,
      currentExperience,
      experienceGained,
    });
    throw new Error("Invalid experience calculation inputs");
  }

  // Ensure values are non-negative
  const safeCurrentLevel = Math.max(1, currentLevel);
  const safeCurrentExperience = Math.max(0, currentExperience);
  const safeExperienceGained = Math.max(0, experienceGained);

  const newExperience = safeCurrentExperience + safeExperienceGained;
  const newLevel = getLevelFromExperience(newExperience);
  const leveledUp = newLevel > safeCurrentLevel;
  const experienceToNext = getExperienceToNextLevel(newLevel, newExperience);

  // Final validation of return values
  const result = {
    experienceGained: safeExperienceGained,
    newLevel: Math.max(1, newLevel),
    newExperience: Math.max(0, newExperience),
    leveledUp,
    experienceToNext: Math.max(0, experienceToNext),
  };

  // Log if any values are invalid
  if (isNaN(result.newLevel) || isNaN(result.newExperience)) {
    console.error("Invalid result from addExperience:", result);
  }

  return result;
}

/**
 * Get level progression percentage (0-100)
 */
export function getLevelProgress(
  currentLevel: number,
  currentExperience: number
): number {
  const currentLevelXP = getExperienceForLevel(currentLevel);
  const nextLevelXP = getExperienceForLevel(currentLevel + 1);
  const xpInCurrentLevel = currentExperience - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;

  return Math.min(
    100,
    Math.max(0, (xpInCurrentLevel / xpNeededForLevel) * 100)
  );
}

/**
 * Get level title/rank based on level
 */
export function getLevelTitle(level: number): string {
  if (level < 5) return "Beginner";
  if (level < 15) return "Novice";
  if (level < 30) return "Amateur";
  if (level < 50) return "Professional";
  if (level < 75) return "Expert";
  if (level < 100) return "Master";
  if (level < 150) return "Legend";
  return "Karaoke God";
}

/**
 * Get level color based on level
 */
export function getLevelColor(level: number): string {
  if (level < 5) return "text-gray-500";
  if (level < 15) return "text-green-500";
  if (level < 30) return "text-blue-500";
  if (level < 50) return "text-purple-500";
  if (level < 75) return "text-pink-500";
  if (level < 100) return "text-yellow-500";
  if (level < 150) return "text-orange-500";
  return "text-red-500";
}
