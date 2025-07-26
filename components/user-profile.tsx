"use client";

import { LogIn, User } from "lucide-react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export function UserProfile() {
  const { isSignedIn, user } = useUser();

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <Button variant="outline" size="sm">
          <LogIn className="mr-2 h-4 w-4" />
          Sign In
        </Button>
      </SignInButton>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="hidden sm:block text-right">
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {user?.firstName || user?.username || "User"}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Level{" "}
          {Math.floor(
            (user?.createdAt
              ? Date.now() - new Date(user.createdAt).getTime()
              : 0) /
              (1000 * 60 * 60 * 24)
          ) + 1}
        </div>
      </div>
      <UserButton
        appearance={{
          elements: {
            avatarBox: "w-8 h-8",
          },
        }}
      />
    </div>
  );
}
