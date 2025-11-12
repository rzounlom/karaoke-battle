import Ably from "ably";

let ablyClient: Ably.Realtime | null = null;

/**
 * Get or create the Ably server-side client
 * This should only be used in API routes (server-side)
 */
export function getAblyServer(): Ably.Realtime {
  if (!ablyClient) {
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ABLY_API_KEY environment variable is not set. Please add it to your .env file."
      );
    }
    ablyClient = new Ably.Realtime(apiKey);
  }
  return ablyClient;
}

/**
 * Get a tournament channel by session code
 * @param sessionCode - The tournament session code (e.g., "ABC123")
 * @returns Ably channel for the tournament
 */
export function getTournamentChannel(sessionCode: string) {
  return getAblyServer().channels.get(`tournament:${sessionCode}`);
}

/**
 * Publish an event to a tournament channel
 * @param sessionCode - The tournament session code
 * @param eventName - The event name (e.g., "player_joined", "turn_started")
 * @param data - The event data to publish
 */
export async function publishTournamentEvent(
  sessionCode: string,
  eventName: string,
  data: unknown
) {
  const channel = getTournamentChannel(sessionCode);
  await channel.publish(eventName, data);
}

