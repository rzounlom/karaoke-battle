import { NextRequest, NextResponse } from "next/server";

import { currentUser } from "@clerk/nextjs/server";
import { getAblyServer } from "@/lib/ably-server";

/**
 * Generate an Ably token for authenticated users
 * This token allows clients to connect to Ably channels
 */
 
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    const body = await req.json().catch(() => ({}));
    const { sessionCode, participantId } = body;

    // Get the Ably server instance
    const ably = getAblyServer();

    let clientId: string;

    if (user) {
      // Authenticated user - use Clerk ID
      clientId = user.id;
    } else if (participantId && sessionCode) {
      // Guest user - use participant ID as clientId
      // This allows guests to connect to Ably for real-time updates
      clientId = `guest_${sessionCode}_${participantId}`;
    } else {
      return NextResponse.json(
        { success: false, error: "Unauthorized - must be authenticated or provide participantId and sessionCode" },
        { status: 401 }
      );
    }

    // Create a token request for this user/guest
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: clientId,
      capability: {
        // Allow subscribing to any tournament channel
        // In production, you might want to restrict this to specific channels
        [`tournament:*`]: ["subscribe", "presence"],
      },
    });

    return NextResponse.json({
      success: true,
      tokenRequest,
    });
  } catch (error) {
    console.error("Error generating Ably token:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate Ably token",
      },
      { status: 500 }
    );
  }
}
