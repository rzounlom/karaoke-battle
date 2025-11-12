"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export function UserSync() {
  const { isSignedIn, user, isLoaded } = useUser();

  useEffect(() => {
    // Wait for auth to be fully loaded before syncing
    if (isLoaded && isSignedIn && user) {
      // Add a small delay to ensure Clerk session is fully established
      // This is especially important right after sign-in
      const syncTimer = setTimeout(() => {
        // Sync user with our database via API route
        // This ensures proper authentication context
        fetch("/api/user/sync", {
          method: "POST",
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then((result) => {
            if (result.success) {
              console.log("User synced:", result.message);
            } else {
              console.error("Failed to sync user:", result.message);
            }
          })
          .catch((error) => {
            console.error("Error syncing user:", error);
            // Don't show error to user - this is a background sync
            // The user can still use the app even if sync fails
          });
      }, 500); // 500ms delay to ensure auth context is ready

      return () => clearTimeout(syncTimer);
    }
  }, [isLoaded, isSignedIn, user]);

  // This component doesn't render anything
  return null;
}
