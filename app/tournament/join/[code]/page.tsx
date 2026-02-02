"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Loader2, LogIn, Trophy, Users } from "lucide-react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
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
  createdAt: string;
}

export default function TournamentJoinPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn } = useUser();

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
  const [joining, setJoining] = useState(false);
  const [temporaryName, setTemporaryName] = useState("");

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
      } else {
        toast.error(data.message || "Failed to load tournament");
        if (data.message?.includes("not found")) {
          router.push("/");
        }
      }
    } catch (error) {
      console.error("Error loading session:", error);
      toast.error("Failed to load tournament", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!session) return;

    // For authenticated users, join directly
    if (isSignedIn) {
      setJoining(true);
      try {
        const response = await fetch("/api/tournament/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionCode: sessionCode,
          }),
        });

        const data = await response.json();

        if (data.success) {
          toast.success("Joined tournament!", "Redirecting to lobby...");
          router.push(`/tournament/lobby/${sessionCode}`);
        } else {
          toast.error(data.message || "Failed to join tournament");
        }
      } catch (error) {
        console.error("Error joining tournament:", error);
        toast.error("Failed to join tournament", "Please try again.");
      } finally {
        setJoining(false);
      }
    } else {
      // For unauthenticated users, require temporary name
      if (!temporaryName.trim()) {
        toast.error(
          "Please enter a name",
          "You need a name to join the tournament."
        );
        return;
      }

      setJoining(true);
      try {
        const response = await fetch("/api/tournament/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionCode: sessionCode,
            temporaryName: temporaryName.trim(),
          }),
        });

        const data = await response.json();

        if (data.success) {
          toast.success("Joined tournament!", "Sign in to save your progress.");
          router.push(`/tournament/lobby/${sessionCode}`);
        } else {
          toast.error(data.message || "Failed to join tournament");
        }
      } catch (error) {
        console.error("Error joining tournament:", error);
        toast.error("Failed to join tournament", "Please try again.");
      } finally {
        setJoining(false);
      }
    }
  };

  if (!sessionCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <PageHeader title="Join Tournament" />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-2">Invalid Tournament Code</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please check the tournament link and try again.
            </p>
            <Button onClick={() => router.push("/")}>Go to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <PageHeader title="Join Tournament" />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600 dark:text-gray-400">
              Loading tournament...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <PageHeader title="Join Tournament" />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-2">Tournament Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This tournament session doesn&apos;t exist or has expired.
            </p>
            <Button onClick={() => router.push("/")}>Go to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  const isFull = session.currentPlayers >= session.maxPlayers;
  const canJoin =
    !isFull && (session.status === "WAITING" || session.status === "STARTING");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      <PageHeader title="Join Tournament" />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {session.name || "Tournament"}
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
                <span>Turn-based</span>
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

          {/* Host Info */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Hosted by
            </p>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={session.host.avatar || undefined} />
                <AvatarFallback>
                  {session.host.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-gray-900 dark:text-white">
                {session.host.displayName}
              </span>
            </div>
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
                    <Avatar className="h-8 w-8">
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
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Turn {participant.turnOrder}
                      </p>
                    </div>
                  </div>
                  {participant.isReady && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                      Ready
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Join Form */}
          {canJoin ? (
            <div className="space-y-4">
              {!isSignedIn && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    <strong>Sign in</strong> to create an account and save your
                    progress. Or enter a temporary name to join as a guest (your
                    progress won&apos;t be saved).
                  </p>
                  <div className="flex gap-2">
                    <SignInButton mode="modal">
                      <Button variant="outline" size="sm" className="flex-1">
                        <LogIn className="h-4 w-4 mr-2" />
                        Sign In
                      </Button>
                    </SignInButton>
                  </div>
                </div>
              )}

              {!isSignedIn && (
                <div>
                  <label
                    htmlFor="temporary-name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Enter Your Name
                  </label>
                  <Input
                    id="temporary-name"
                    type="text"
                    placeholder="Your name"
                    value={temporaryName}
                    onChange={(e) => setTemporaryName(e.target.value)}
                    maxLength={30}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleJoin();
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This name will be used in the tournament
                  </p>
                </div>
              )}

              <Button
                onClick={handleJoin}
                disabled={joining || (!isSignedIn && !temporaryName.trim())}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                size="lg"
              >
                {joining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Tournament"
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              {isFull ? (
                <p className="text-gray-600 dark:text-gray-400">
                  This tournament is full ({session.maxPlayers} players)
                </p>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">
                  This tournament has already started or ended
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
