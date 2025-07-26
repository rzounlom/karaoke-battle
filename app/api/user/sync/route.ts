import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, syncUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const result = await syncUser();

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error("Error in sync API:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (user) {
      return NextResponse.json({ success: true, user });
    } else {
      return NextResponse.json(
        { success: false, message: "No user found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error in get user API:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
