"use client";

import { ArrowLeft, Home, Music, Settings, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfile } from "@/components/user-profile";
import { usePathname } from "next/navigation";
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

  return (
    <header className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-4">
        {/* Back Button */}
        {showBackButton && (
          <Link href={backHref}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
        )}

        {/* Navigation Links - Only show for logged-in users */}
        {isSignedIn && showNavigation && (
          <div className="hidden md:flex items-center space-x-2">
            <Link href="/">
              <Button
                variant={pathname === "/" ? "default" : "ghost"}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Button>
            </Link>

            <Link href="/songs">
              <Button
                variant={pathname.startsWith("/songs") ? "default" : "ghost"}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Music className="h-4 w-4" />
                <span>Songs</span>
              </Button>
            </Link>

            <Link href="/results">
              <Button
                variant={pathname === "/results" ? "default" : "ghost"}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Trophy className="h-4 w-4" />
                <span>Results</span>
              </Button>
            </Link>

            <Link href="/profile">
              <Button
                variant={pathname === "/profile" ? "default" : "ghost"}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>Profile</span>
              </Button>
            </Link>
          </div>
        )}

        {/* Page Title */}
        <div className="text-gray-900 dark:text-white">
          <h1 className="text-2xl font-bold karaoke-text-gradient">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-white/70">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right side - Theme toggle and User profile */}
      <div className="flex items-center space-x-4">
        <UserProfile />
        <ThemeToggle />
      </div>
    </header>
  );
}
