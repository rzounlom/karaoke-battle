import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/songs",
  "/game-mode",
  "/api/user/sync",
  "/sign-in", // Add sign-in page to public routes
  "/sign-up", // Add sign-up page to public routes (Clerk might redirect here)
  "/sso-callback", // Clerk SSO callback route
]);

// Define routes that should be completely ignored by Clerk
const isIgnoredRoute = createRouteMatcher(["/api/user/sync"]);

export default clerkMiddleware(async (auth, req) => {
  // Skip authentication for ignored routes
  if (isIgnoredRoute(req)) return;

  // Allow public routes without authentication
  if (isPublicRoute(req)) return;

  // For all other routes, require authentication
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
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp3|wav|ogg|lrc|txt)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
