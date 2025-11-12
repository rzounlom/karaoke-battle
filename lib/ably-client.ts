import Ably from "ably";

/**
 * Get an Ably client instance for client-side use
 * @param token - Ably token (generated server-side via API route)
 * @returns Ably Realtime client
 */
export function getAblyClient(token: string): Ably.Realtime {
  return new Ably.Realtime({ token });
}

/**
 * Get a tournament channel for client-side subscription
 * @param ablyClient - Ably client instance
 * @param sessionCode - The tournament session code (e.g., "ABC123")
 * @returns Ably channel for the tournament
 */
export function getTournamentChannel(
  ablyClient: Ably.Realtime,
  sessionCode: string
) {
  return ablyClient.channels.get(`tournament:${sessionCode}`);
}

