"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Loader2, Trophy, Users } from "lucide-react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import React from "react";
import { toast } from "@/lib/toast";

interface TournamentSession {
  id: string;
  sessionCode: string;
  name: string | null;
  status: string;
  maxPlayers: number;
  currentPlayers: number;
  host: {
    id: string;
    displayName: string;
    avatar: string | null;
  };
  participants: Array<{
    id: string;
    displayName: string;
    turnOrder: number;
    isReady: boolean;
    hasAccount: boolean;
    user: {
      id: string;
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      avatar: string | null;
    } | null;
  }>;
  settings: {
    rounds?: number;
    turnTimeLimit?: number;
    songSelectionTimeLimit?: number;
  };
}

// Component to filter out redirectUrl prop from SignInButton
const SignInButtonChild = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { redirectUrl?: string }
>((props, ref) => {
  const { redirectUrl, ...restProps } = props;
  void redirectUrl; // Explicitly mark as intentionally unused
  return (
    <button
      ref={ref}
      type="button"
      className="inline-flex items-center justify-center rounded-md bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
      {...restProps}
    >
      Sign In / Sign Up
    </button>
  );
});
SignInButtonChild.displayName = "SignInButtonChild";

export default function TournamentLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded, user: clerkUser } = useUser();

  // Safely extract session code from params
  let sessionCode = "";
  try {
    if (params && "code" in params) {
      const codeValue = params.code;
      sessionCode =
        typeof codeValue === "string"
          ? codeValue
          : Array.isArray(codeValue)
          ? codeValue[0] || ""
          : String(codeValue || "");
    }
  } catch (error) {
    console.error("Error extracting session code from params:", error);
  }

  const [session, setSession] = useState<TournamentSession | null>(null);
  const [loading, setLoading] = useState(true);
  // const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (sessionCode) {
      loadSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode]);

  const loadSession = async () => {
    if (!sessionCode) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/tournament/session/${sessionCode}`);
      const data = await response.json();

      if (data.success) {
        setSession(data.session);
        // Check if current user is the host
        if (isSignedIn && clerkUser) {
          // We'll need to check this properly when we have user ID
          // For now, just set a placeholder
        }
      } else {
        toast.error(data.message || "Failed to load tournament");
        if (data.message?.includes("not found")) {
          router.push("/songs");
        }
      }
    } catch (error) {
      console.error("Error loading session:", error);
      toast.error("Failed to load tournament", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <PageHeader title="Tournament Lobby" />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600 dark:text-gray-400">
              Loading tournament lobby...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <PageHeader title="Tournament Lobby" />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-2">Tournament Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This tournament session doesn&apos;t exist or has expired.
            </p>
            <Button onClick={() => router.push("/songs")}>Go to Songs</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      <PageHeader title="Tournament Lobby" />

      {/* Sign-In Required Modal - Blocks page until user signs in */}
      {isLoaded && !isSignedIn && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Sign In Required
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You need to sign in or create an account to view and join
                tournaments. This modal will remain until you sign in.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <SignInButton
                  mode="modal"
                  fallbackRedirectUrl={
                    typeof window !== "undefined"
                      ? window.location.href
                      : undefined
                  }
                >
                  <SignInButtonChild />
                </SignInButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={`container mx-auto px-4 py-8 max-w-4xl ${
          isLoaded && !isSignedIn ? "blur-sm pointer-events-none" : ""
        }`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {session.name || "Tournament"} Lobby
            </h1>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>
                  {session.currentPlayers} / {session.maxPlayers} players
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Waiting for players...</span>
              </div>
            </div>
          </div>

          {/* Session Code */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 mb-6 text-center border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Session Code
            </p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 font-mono tracking-wider">
              {session.sessionCode}
            </p>
          </div>

          {/* Participants List */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Players ({session.participants.length})
            </p>
            <div className="space-y-2">
              {session.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={participant.user?.avatar || undefined}
                      />
                      <AvatarFallback>
                        {participant.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {participant.displayName}
                        {participant.turnOrder === 1 && (
                          <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded">
                            Host
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Turn {participant.turnOrder}
                      </p>
                    </div>
                  </div>
                  {participant.isReady ? (
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                      Ready
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                      Not Ready
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Lobby functionality coming soon!</strong>
              <br />
              Ready status, start tournament, and real-time updates will be
              available in Stage 4.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
