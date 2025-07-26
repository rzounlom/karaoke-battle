import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/songs",
  "/game-mode",
  "/api/user/sync",
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
    // Redirect to sign-in page
    return Response.redirect(new URL("/sign-in", req.url));
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
