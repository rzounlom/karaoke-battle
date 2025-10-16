"use client";

import { LogIn, Settings } from "lucide-react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { getLevelColor, getLevelTitle } from "@/lib/experience";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import Link from "next/link";

interface UserLevelInfo {
  level: number;
  experience: number;
  levelInfo: {
    level: number;
    experience: number;
    experienceToNext: number;
    totalExperienceForLevel: number;
  };
}

export function UserProfile() {
  const { isSignedIn, user } = useUser();
  const [levelInfo, setLevelInfo] = useState<UserLevelInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSignedIn) {
      fetchUserLevel();
    }
  }, [isSignedIn]);

  const fetchUserLevel = async () => {
    try {
      const response = await fetch("/api/user/experience");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLevelInfo(data);
        }
      }
    } catch (error) {
      console.error("Error fetching user level:", error);
    } finally {
      setLoading(false);
    }
  };

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
          {loading ? (
            "Loading..."
          ) : levelInfo ? (
            <>
              <span
                className={`font-bold text-lg ${getLevelColor(
                  levelInfo.level
                )}`}
              >
                Level {levelInfo.level} - {getLevelTitle(levelInfo.level)}
              </span>
              <br />
              <span className="text-xs">
                {levelInfo.experience} XP •{" "}
                {levelInfo.levelInfo.experienceToNext} to next
              </span>
            </>
          ) : (
            "Level 1"
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Link href="/profile">
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
            },
          }}
        />
      </div>
    </div>
  );
}
