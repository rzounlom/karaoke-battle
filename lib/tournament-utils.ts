import { prisma } from "@/lib/prisma";

/**
 * Generate a random alphanumeric session code
 * @param length - Length of the code (default: 6)
 * @returns Random alphanumeric string
 */
function generateSessionCode(length: number = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a unique tournament session code
 * Checks database to ensure uniqueness
 * @param length - Length of the code (default: 6)
 * @param maxAttempts - Maximum attempts to generate unique code (default: 10)
 * @returns Unique session code
 */
export async function generateUniqueSessionCode(
  length: number = 6,
  maxAttempts: number = 10
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateSessionCode(length);
    
    // Check if code already exists
    const existing = await prisma.tournamentSession.findUnique({
      where: { sessionCode: code },
    });

    if (!existing) {
      return code;
    }
  }

  // If we couldn't generate a unique code, try with longer length
  if (length < 8) {
    return generateUniqueSessionCode(length + 1, maxAttempts);
  }

  throw new Error("Failed to generate unique session code");
}

/**
 * Create a shareable tournament join URL
 * @param sessionCode - The tournament session code
 * @returns Full URL for joining the tournament
 */
export function createTournamentJoinUrl(sessionCode: string): string {
  if (typeof window !== "undefined") {
    // Client-side: use current origin
    return `${window.location.origin}/tournament/join/${sessionCode}`;
  }
  // Server-side: use environment variable or default
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/tournament/join/${sessionCode}`;
}

