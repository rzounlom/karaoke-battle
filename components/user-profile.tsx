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

interface UserProfileData {
  id: string;
  username: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  level: number;
  experience: number;
}

export function UserProfile() {
  const { isSignedIn } = useUser();
  const [levelInfo, setLevelInfo] = useState<UserLevelInfo | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSignedIn) {
      fetchUserLevel();
      fetchUserProfile();
    }
  }, [isSignedIn]);

  // Listen for profile updates from other components
  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log("🔄 Profile update detected, refetching...");
      fetchUserProfile();
    };

    // Listen for custom events when profile is updated
    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, []);

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

  const fetchUserProfile = async () => {
    try {
      console.log("🔍 Fetching user profile...");
      const response = await fetch("/api/user/profile");
      console.log("📡 Profile response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("📊 Profile data:", data);

        if (data.success) {
          console.log("✅ Setting user profile:", data.user);
          setUserProfile(data.user);
        } else {
          console.log("❌ Profile fetch failed:", data.message);
        }
      } else {
        console.log("❌ Profile response not ok:", response.status);
      }
    } catch (error) {
      console.error("❌ Error fetching user profile:", error);
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
    <div className="flex items-center space-x-3">
      {/* User Name - Always visible */}
      <div className="text-right">
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {(() => {
            // Show loading state while fetching profile data
            if (loading) {
              return "Loading...";
            }

            // Only use API data once it's loaded, no Clerk fallbacks
            const displayName = userProfile?.username
              ? userProfile.username
              : userProfile?.firstName && userProfile?.lastName
              ? `${userProfile.firstName} ${userProfile.lastName}`
              : userProfile?.firstName || "User";
            console.log("🎭 Display name:", {
              userProfileUsername: userProfile?.username,
              userProfileFirstName: userProfile?.firstName,
              userProfileLastName: userProfile?.lastName,
              finalDisplayName: displayName,
            });
            return displayName;
          })()}
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

      {/* Action Buttons */}
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
