/**
 * Migration script to set expiresAt for existing PENDING challenges
 * that don't have an expiration date set.
 * 
 * Run with: npx tsx scripts/update-pending-challenges-expiration.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updatePendingChallengesExpiration() {
  try {
    console.log("Starting migration: Setting expiresAt for PENDING challenges...");

    // Find all PENDING challenges without expiresAt
    const pendingChallenges = await prisma.challenge.findMany({
      where: {
        status: "PENDING",
        expiresAt: null,
      },
    });

    console.log(`Found ${pendingChallenges.length} PENDING challenges without expiresAt`);

    let updated = 0;
    for (const challenge of pendingChallenges) {
      // Set expiration to 3 days from creation date
      const acceptanceDeadline = new Date(challenge.createdAt);
      acceptanceDeadline.setDate(acceptanceDeadline.getDate() + 3);

      await prisma.challenge.update({
        where: { id: challenge.id },
        data: { expiresAt: acceptanceDeadline },
      });

      updated++;
      console.log(
        `Updated challenge ${challenge.id}: expiresAt set to ${acceptanceDeadline.toISOString()}`
      );
    }

    console.log(`\nMigration complete! Updated ${updated} challenges.`);
  } catch (error) {
    console.error("Error updating challenges:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updatePendingChallengesExpiration()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

