"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export function AuthRedirectHandler() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // User is signed in, check if there's a stored destination
      const intendedDestination = sessionStorage.getItem("intendedDestination");
      if (intendedDestination) {
        // Clear the stored destination
        sessionStorage.removeItem("intendedDestination");

        // Navigate to the intended destination
        router.push(intendedDestination);
      }
    }
  }, [isLoaded, isSignedIn, router]);

  // Also handle direct navigation to protected routes
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // User is not signed in, check if we're on a protected route
      const currentPath = window.location.pathname;
      const protectedRoutes = ["/gameplay", "/results"];

      if (protectedRoutes.includes(currentPath)) {
        // Store the current location as intended destination
        const currentUrl = window.location.href;
        sessionStorage.setItem("intendedDestination", currentUrl);
      }
    }
  }, [isLoaded, isSignedIn]);

  return null; // This component doesn't render anything
}
