import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/songs",
  "/api/user/sync",
  "/sign-in",
  "/sign-up",
  "/sso-callback",
]);

// Check if route is a tournament route
function isTournamentRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/tournament/join/") ||
    pathname.startsWith("/tournament/lobby/") ||
    pathname.startsWith("/api/tournament/")
  );
}

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  // Skip authentication for tournament routes (they handle auth internally)
  if (isTournamentRoute(pathname)) {
    return NextResponse.next();
  }

  // Skip authentication for public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // For all other routes, require authentication
  // Only call auth() if we actually need to check authentication
  const { userId } = await auth();
  if (!userId) {
    // Redirect to sign-in with return URL
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and tournament routes
    // Tournament routes are completely excluded from middleware
    "/((?!_next|tournament|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp3|wav|ogg|lrc|txt)).*)",
    // API routes (excluding tournament API routes)
    "/(api|trpc)((?!.*tournament).*)",
  ],
};
