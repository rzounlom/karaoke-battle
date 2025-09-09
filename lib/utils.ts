import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  // Handle NaN, Infinity, and invalid values
  if (!isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function formatScore(score: number): string {
  return score.toLocaleString();
}

export function calculateAccuracy(
  recognized: string,
  expected: string
): number {
  if (!expected) return 0;

  const recognizedWords = recognized.toLowerCase().split(/\s+/);
  const expectedWords = expected.toLowerCase().split(/\s+/);

  let correctWords = 0;
  for (const word of recognizedWords) {
    if (expectedWords.includes(word)) {
      correctWords++;
    }
  }

  return Math.round((correctWords / expectedWords.length) * 100);
}
