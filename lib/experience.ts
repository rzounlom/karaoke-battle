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
  // Base experience from total score (0-100 scale)
  let baseExperience = Math.floor(totalScore * 0.5); // 0-50 base XP

  // Performance bonuses
  const accuracyBonus = Math.floor(accuracy * 0.3); // 0-30 bonus
  const timingBonus = Math.floor(timing * 0.2); // 0-20 bonus
  const pitchBonus = Math.floor(pitch * 0.2); // 0-20 bonus

  // Difficulty multiplier
  const difficultyMultiplier = {
    EASY: 0.8,
    MEDIUM: 1.0,
    HARD: 1.3,
  }[songDifficulty];

  // Perfect performance bonus (all scores > 90%)
  const perfectBonus = accuracy > 90 && timing > 90 && pitch > 90 ? 25 : 0;

  // Calculate total experience
  const totalExperience = Math.floor(
    (baseExperience + accuracyBonus + timingBonus + pitchBonus + perfectBonus) *
      difficultyMultiplier
  );

  // Minimum 1 XP, maximum 150 XP per game
  return Math.max(1, Math.min(150, totalExperience));
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
  let level = 1;
  let requiredXP = 0;

  while (requiredXP <= totalExperience) {
    level++;
    requiredXP = getExperienceForLevel(level);
  }

  return level - 1;
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
  const newExperience = currentExperience + experienceGained;
  const newLevel = getLevelFromExperience(newExperience);
  const leveledUp = newLevel > currentLevel;
  const experienceToNext = getExperienceToNextLevel(newLevel, newExperience);

  return {
    experienceGained,
    newLevel,
    newExperience,
    leveledUp,
    experienceToNext,
  };
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
