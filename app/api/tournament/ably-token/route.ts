import { NextRequest, NextResponse } from "next/server";

import { currentUser } from "@clerk/nextjs/server";
import { getAblyServer } from "@/lib/ably-server";

/**
 * Generate an Ably token for authenticated users
 * This token allows clients to connect to Ably channels
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the Ably server instance
    const ably = getAblyServer();

    // Create a token request for this user
    // The clientId should be the user's Clerk ID
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: user.id,
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
