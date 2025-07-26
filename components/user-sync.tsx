"use client";

import { syncUser } from "@/lib/auth";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export function UserSync() {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      // Sync user with our database
      syncUser().then((result) => {
        if (result.success) {
          console.log("User synced:", result.message);
        } else {
          console.error("Failed to sync user:", result.message);
        }
      });
    }
  }, [isSignedIn, user]);

  // This component doesn't render anything
  return null;
}
