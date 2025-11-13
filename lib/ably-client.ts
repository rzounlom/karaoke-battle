import Ably from "ably";

/**
 * Get an Ably client instance for client-side use
 * @param tokenRequest - Ably token request object (generated server-side via API route)
 * @returns Ably Realtime client
 */
export function getAblyClient(tokenRequest: Ably.TokenRequest): Ably.Realtime {
  return new Ably.Realtime({
    authCallback: async (tokenParams, callback) => {
      // Return the token request directly
      callback(null, tokenRequest);
    },
  });
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

