"use client";

import { ArrowLeft, Music, Settings, Trophy, Users, Sword } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfile } from "@/components/user-profile";
import { NotificationBell } from "@/components/notification-bell";
import { useUser } from "@clerk/nextjs";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backHref?: string;
  showNavigation?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  showBackButton = false,
  backHref = "/",
  showNavigation = true,
}: PageHeaderProps) {
  const { isSignedIn } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  // Hide navigation on gameplay pages
  const isGameplayPage = pathname.startsWith("/gameplay");
  const shouldShowNavigation = isSignedIn && showNavigation && !isGameplayPage;

  // Main navigation pages - don't show page title for these
  const mainNavPages = ["/songs", "/performances", "/friends", "/battles", "/profile"];
  const isMainNavPage = mainNavPages.includes(pathname);

  const handleBackClick = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to the provided backHref if no history
      router.push(backHref);
    }
  };

  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-4">
        {/* Back Button */}
        {showBackButton && (
          <Button variant="ghost" size="icon" onClick={handleBackClick}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Karaoke Battle Branding - Always on the far left */}
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <h1 className="text-2xl font-bold karaoke-text-gradient">
            Karaoke Battle
          </h1>
        </Link>

        {/* Navigation Links - Only show for logged-in users, not on gameplay pages */}
        {shouldShowNavigation && (
          <div className="hidden md:flex items-center space-x-2">
            <Link href="/songs">
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center space-x-2 ${
                  pathname.startsWith("/songs")
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <Music className="h-4 w-4" />
                <span>Songs</span>
              </Button>
            </Link>

            <Link href="/performances">
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center space-x-2 ${
                  pathname === "/performances"
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <Trophy className="h-4 w-4" />
                <span>Performances</span>
              </Button>
            </Link>

            <Link href="/friends">
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center space-x-2 ${
                  pathname === "/friends"
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Friends</span>
              </Button>
            </Link>

            <Link href="/battles">
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center space-x-2 ${
                  pathname === "/battles"
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <Sword className="h-4 w-4" />
                <span>Battles</span>
              </Button>
            </Link>

            <Link href="/profile">
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center space-x-2 ${
                  pathname === "/profile"
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Profile</span>
              </Button>
            </Link>
          </div>
        )}

        {/* Page Title - Only show if different from Karaoke Battle and not a main nav page */}
        {title !== "Karaoke Battle" && !isMainNavPage && (
          <div className="text-gray-900 dark:text-white">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-white/70">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right side - Notifications, Theme toggle and User profile */}
      <div className="flex items-center space-x-4">
        {shouldShowNavigation && <NotificationBell />}
        <UserProfile />
        <ThemeToggle />
      </div>
    </header>
  );
}
