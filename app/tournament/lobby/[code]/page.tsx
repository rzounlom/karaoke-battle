"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Clock,
  Loader2,
  LogIn,
  LogOut,
  Play,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { getAblyClient, getTournamentChannel } from "@/lib/ably-client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Ably from "ably";
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
}

export default function TournamentLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, user: clerkUser } = useUser();
  const ablyClientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);

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
  const [togglingReady, setTogglingReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [removingParticipant, setRemovingParticipant] = useState<string | null>(
    null
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentParticipantId, setCurrentParticipantId] = useState<
    string | null
  >(null);

  // Get current user's database ID and clear state on sign out
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      if (isSignedIn && clerkUser) {
        try {
          const response = await fetch("/api/user/profile");
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              setCurrentUserId(data.user.id);
            }
          }
        } catch (error) {
          console.error("Error fetching user ID:", error);
        }
      } else {
        // Clear user ID and participant ID when user signs out
        // This prevents logged-out users from accessing authenticated participant features
        setCurrentUserId(null);
        // Only clear currentParticipantId if it was for an authenticated user
        // (guests should keep their participant ID in sessionStorage)
        if (typeof window !== "undefined") {
          const storedParticipantId = sessionStorage.getItem(
            `tournament_${sessionCode}_participantId`
          );
          // If there's no stored participant ID, clear the state
          // This means the participant ID was from an authenticated user
          if (!storedParticipantId) {
            setCurrentParticipantId(null);
          }
        }
      }
    };

    fetchCurrentUserId();
  }, [isSignedIn, clerkUser, sessionCode]);

  // Set up Ably real-time updates (only for authenticated users)
  // Note: Unauthenticated users can still view the lobby, but won't get real-time updates
  useEffect(() => {
    if (!sessionCode || !isSignedIn) return;

    let mounted = true;

    const setupAbly = async () => {
      try {
        // Get Ably token
        const tokenResponse = await fetch("/api/tournament/ably-token", {
          method: "POST",
        });
        const tokenData = await tokenResponse.json();

        if (!tokenData.success || !tokenData.tokenRequest) {
          console.error("Failed to get Ably token");
          return;
        }

        // Create Ably client
        const client = getAblyClient(tokenData.tokenRequest);
        ablyClientRef.current = client;

        // Get tournament channel
        const channel = getTournamentChannel(client, sessionCode);
        channelRef.current = channel;

        // Subscribe to events
        channel.subscribe("player_joined", () => {
          if (mounted) {
            loadSession(); // Reload session to get updated participant list
          }
        });

        channel.subscribe("player_left", () => {
          if (mounted) {
            loadSession();
          }
        });

        channel.subscribe("player_ready", (message) => {
          if (mounted) {
            const { participantId, isReady } = message.data as {
              participantId: string;
              isReady: boolean;
            };
            setSession((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                participants: prev.participants.map((p) =>
                  p.id === participantId ? { ...p, isReady } : p
                ),
              };
            });
          }
        });

        channel.subscribe("tournament_started", (message) => {
          if (mounted) {
            const { firstTurn } = message.data as {
              firstTurn: { id: string };
            };
            toast.success("Tournament started!", "Redirecting to gameplay...");
            // Redirect to gameplay with turn info
            router.push(
              `/gameplay?tournamentSession=${sessionCode}&turnId=${firstTurn.id}`
            );
          }
        });

        channel.subscribe("session_updated", () => {
          if (mounted) {
            loadSession();
          }
        });

        channel.subscribe("player_removed", () => {
          if (mounted) {
            loadSession(); // Reload session to get updated participant list
          }
        });
      } catch (error) {
        console.error("Error setting up Ably:", error);
      }
    };

    setupAbly();

    return () => {
      mounted = false;
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (ablyClientRef.current) {
        ablyClientRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode, isSignedIn, router]);

  useEffect(() => {
    if (sessionCode) {
      // Check for stored participant ID (for guests)
      if (!isSignedIn) {
        const storedId = sessionStorage.getItem(
          `tournament_${sessionCode}_participantId`
        );
        if (storedId) {
          setCurrentParticipantId(storedId);
        }
      }
      loadSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode, isSignedIn]);

  const loadSession = async () => {
    if (!sessionCode) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/tournament/session/${sessionCode}`);

      // Check if response is ok (status 200-299)
      if (!response.ok) {
        // If it's a 500 error, it's likely a database connection issue
        if (response.status === 500) {
          toast.error(
            "Database connection error",
            "Please try again in a moment."
          );
          // Don't set session to null on database errors - keep showing what we have
          return;
        }

        const data = await response.json();
        toast.error(data.message || "Failed to load tournament");
        // Only redirect if it's actually "not found" (404)
        if (response.status === 404 || data.message?.includes("not found")) {
          // Small delay before redirect to show error message
          setTimeout(() => {
            router.push("/songs");
          }, 2000);
        }
        return;
      }

      const data = await response.json();

      if (data.success) {
        setSession(data.session);
        // Store participant ID if user is a participant (for guests)
        if (data.session.participants) {
          // First, try to get stored participant ID (for guests) or use current participant ID state
          const storedParticipantId =
            typeof window !== "undefined"
              ? sessionStorage.getItem(
                  `tournament_${sessionCode}_participantId`
                ) || currentParticipantId
              : currentParticipantId;

          const participant = data.session.participants.find(
            (p: { id: string; user?: { id: string } | null }) => {
              // For authenticated users, check by user ID
              if (currentUserId && p.user?.id) {
                return p.user.id === currentUserId;
              }
              // For guests, check by stored participant ID
              if (storedParticipantId) {
                return p.id === storedParticipantId;
              }
              return false;
            }
          );
          if (participant) {
            setCurrentParticipantId(participant.id);
            // Store in sessionStorage for guests
            if (!isSignedIn && typeof window !== "undefined") {
              sessionStorage.setItem(
                `tournament_${sessionCode}_participantId`,
                participant.id
              );
            }
          }
        }
      } else {
        toast.error(data.message || "Failed to load tournament");
        // Only redirect if it's actually "not found"
        if (data.message?.includes("not found")) {
          setTimeout(() => {
            router.push("/songs");
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Error loading session:", error);
      // Don't show error toast for network errors - might be temporary
      // Just log it and let the user retry
      toast.error(
        "Connection error",
        "Please check your internet connection and try again."
      );
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
          toast.success("Joined tournament!", "Refreshing lobby...");
          // Store participant ID for guests
          if (data.participant?.id && !isSignedIn) {
            sessionStorage.setItem(
              `tournament_${sessionCode}_participantId`,
              data.participant.id
            );
            setCurrentParticipantId(data.participant.id);
          }
          // Reload session to show updated participant list
          await loadSession();
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
          // Store participant ID for guests
          if (data.participant?.id) {
            sessionStorage.setItem(
              `tournament_${sessionCode}_participantId`,
              data.participant.id
            );
            setCurrentParticipantId(data.participant.id);
          }
          setTemporaryName("");
          // Reload session to show updated participant list
          await loadSession();
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

  const handleToggleReady = async () => {
    if (!session) return;

    // Security check: Only allow ready toggle for:
    // 1. Authenticated users who are participants
    // 2. Guest users who have joined (have a stored participant ID)
    // NOT for logged-out authenticated users

    // For authenticated users, they must have a currentUserId
    if (isSignedIn && !currentUserId) {
      toast.error("Please sign in again", "Your session has expired.");
      return;
    }

    // For unauthenticated users, they must have a stored participant ID (from joining as guest)
    if (!isSignedIn) {
      const storedParticipantId =
        typeof window !== "undefined"
          ? sessionStorage.getItem(`tournament_${sessionCode}_participantId`)
          : null;
      if (!storedParticipantId) {
        toast.error(
          "You must join the tournament first",
          "Please join as a guest or sign in."
        );
        return;
      }
    }

    // Get participant ID - use currentParticipant if available, otherwise use stored ID
    const participantIdToUse =
      currentParticipant?.id ||
      currentParticipantId ||
      (typeof window !== "undefined" && !isSignedIn
        ? sessionStorage.getItem(`tournament_${sessionCode}_participantId`)
        : null);

    if (!participantIdToUse) {
      toast.error(
        "Unable to identify participant",
        "Please try refreshing the page."
      );
      return;
    }

    setTogglingReady(true);
    try {
      const response = await fetch("/api/tournament/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionCode: sessionCode,
          participantId: participantIdToUse, // Include participant ID for guests
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update session with new participant data
        if (data.session) {
          setSession(data.session);
        }
      } else {
        toast.error(data.message || "Failed to toggle ready status");
      }
    } catch (error) {
      console.error("Error toggling ready status:", error);
      toast.error("Failed to toggle ready status", "Please try again.");
    } finally {
      setTogglingReady(false);
    }
  };

  const handleStartTournament = async () => {
    if (!session) return;

    setStarting(true);
    try {
      const response = await fetch("/api/tournament/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionCode: sessionCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Tournament started!", "Redirecting...");
        // Redirect will happen via Ably event
        if (data.firstTurn) {
          router.push(
            `/gameplay?tournamentSession=${sessionCode}&turnId=${data.firstTurn.id}`
          );
        }
      } else {
        toast.error(data.message || "Failed to start tournament");
      }
    } catch (error) {
      console.error("Error starting tournament:", error);
      toast.error("Failed to start tournament", "Please try again.");
    } finally {
      setStarting(false);
    }
  };

  const handleLeaveTournament = async () => {
    if (!session) return;

    // Security check: Only allow leaving for:
    // 1. Authenticated users who are participants
    // 2. Guest users who have joined (have a stored participant ID)
    // NOT for logged-out authenticated users

    // For authenticated users, they must have a currentUserId
    if (isSignedIn && !currentUserId) {
      toast.error("Please sign in again", "Your session has expired.");
      return;
    }

    // For unauthenticated users, they must have a stored participant ID (from joining as guest)
    if (!isSignedIn) {
      const storedParticipantId =
        typeof window !== "undefined"
          ? sessionStorage.getItem(`tournament_${sessionCode}_participantId`)
          : null;
      if (!storedParticipantId) {
        toast.error(
          "You must join the tournament first",
          "Please join as a guest or sign in."
        );
        return;
      }
    }

    // Get participant ID
    const participantIdToUse =
      currentParticipant?.id ||
      currentParticipantId ||
      (typeof window !== "undefined" && !isSignedIn
        ? sessionStorage.getItem(`tournament_${sessionCode}_participantId`)
        : null);

    if (!participantIdToUse) {
      toast.error(
        "Unable to identify participant",
        "Please try refreshing the page."
      );
      return;
    }

    setLeaving(true);
    try {
      const response = await fetch("/api/tournament/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionCode: sessionCode,
          participantId: participantIdToUse,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          "Left tournament",
          "You have been removed from the tournament."
        );
        // Clear participant ID from sessionStorage (for both guests and authenticated users)
        if (typeof window !== "undefined") {
          sessionStorage.removeItem(`tournament_${sessionCode}_participantId`);
        }
        // Clear participant state
        setCurrentParticipantId(null);
        // Reload session to show updated participant list
        await loadSession();
      } else {
        toast.error(data.message || "Failed to leave tournament");
      }
    } catch (error) {
      console.error("Error leaving tournament:", error);
      toast.error("Failed to leave tournament", "Please try again.");
    } finally {
      setLeaving(false);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!session) return;

    setRemovingParticipant(participantId);
    try {
      const response = await fetch("/api/tournament/remove-participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionCode: sessionCode,
          participantId: participantId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          "Participant removed",
          "The player has been removed from the tournament."
        );
        // Update session with new participant data
        if (data.session) {
          setSession(data.session);
        }
      } else {
        toast.error(data.message || "Failed to remove participant");
      }
    } catch (error) {
      console.error("Error removing participant:", error);
      toast.error("Failed to remove participant", "Please try again.");
    } finally {
      setRemovingParticipant(null);
    }
  };

  // Check if current user is a participant
  // For guests, also check sessionStorage in case state hasn't updated yet
  // Only access sessionStorage on client side
  const storedParticipantIdForGuest =
    !isSignedIn && typeof window !== "undefined"
      ? sessionStorage.getItem(`tournament_${sessionCode}_participantId`)
      : null;
  const participantIdToMatch =
    currentParticipantId || storedParticipantIdForGuest;

  const currentParticipant = session?.participants?.find((p) => {
    if (!p) return false; // Safety check
    // For authenticated users, check by user ID
    if (currentUserId && p.user?.id) {
      return p.user.id === currentUserId;
    }
    // For guests, check by participant ID (from state or sessionStorage)
    if (participantIdToMatch) {
      return p.id === participantIdToMatch;
    }
    return false;
  });

  // Check if current user is the host
  const isHost = session && currentUserId && session.host?.id === currentUserId;

  const isFull = session ? session.currentPlayers >= session.maxPlayers : false;
  const canJoin =
    session &&
    !isFull &&
    (session.status === "WAITING" || session.status === "STARTING") &&
    !currentParticipant;

  const allReady =
    session &&
    session.participants &&
    session.participants.length > 0 &&
    session.participants.every((p) => p.isReady);
  const canStart =
    isHost &&
    session &&
    session.status === "WAITING" &&
    session.participants &&
    session.participants.length >= 2 &&
    allReady;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <PageHeader />
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
        <PageHeader />
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
      <PageHeader />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
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
                  <div className="flex items-center gap-2">
                    {participant.isReady ? (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                        Ready
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                        Not Ready
                      </span>
                    )}
                    {/* Show ready toggle button for current user */}
                    {/* Only show if:
                        1. User is authenticated AND is a participant (currentUserId matches)
                        2. OR user is a guest AND has a stored participant ID in sessionStorage
                        NOT for logged-out authenticated users */}
                    {participant &&
                      ((isSignedIn &&
                        currentUserId &&
                        currentParticipant?.id === participant.id) ||
                        (!isSignedIn &&
                          typeof window !== "undefined" &&
                          sessionStorage.getItem(
                            `tournament_${sessionCode}_participantId`
                          ) === participant.id)) &&
                      (session.status === "WAITING" ||
                        session.status === "STARTING") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleToggleReady}
                          disabled={togglingReady}
                          className="text-xs"
                        >
                          {togglingReady ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : participant.isReady ? (
                            "Unready"
                          ) : (
                            "Ready"
                          )}
                        </Button>
                      )}
                    {/* Show remove button for host (can't remove themselves) */}
                    {isHost &&
                      participant &&
                      participant.user?.id !== currentUserId &&
                      (session.status === "WAITING" ||
                        session.status === "STARTING") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRemoveParticipant(participant.id)
                          }
                          disabled={removingParticipant === participant.id}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                          title="Remove player"
                        >
                          {removingParticipant === participant.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Join Form - Show if user can join */}
          {canJoin && (
            <div className="space-y-4 mb-6">
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
          )}

          {/* Full or Started Message */}
          {session && !currentParticipant && (
            <div className="mb-6">
              {isFull ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    This tournament is full ({session.maxPlayers} players)
                  </p>
                </div>
              ) : session.status !== "WAITING" &&
                session.status !== "STARTING" ? (
                <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This tournament has already started or ended
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Ready Status Summary */}
          {session &&
            (session.status === "WAITING" || session.status === "STARTING") &&
            session.participants.length > 0 && (
              <div className="mb-6">
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <p className="text-sm text-purple-800 dark:text-purple-200 text-center">
                    <strong>
                      {session.participants.filter((p) => p.isReady).length} /{" "}
                      {session.participants.length} players ready
                    </strong>
                    {!allReady && (
                      <span className="block mt-1 text-xs">
                        All players must be ready to start
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

          {/* Start Tournament Button (Host Only) */}
          {canStart && (
            <div className="mb-6">
              <Button
                onClick={handleStartTournament}
                disabled={starting}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                size="lg"
              >
                {starting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Tournament
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Leave Tournament Button */}
          {currentParticipant &&
            (session.status === "WAITING" || session.status === "STARTING") &&
            !isHost && (
              <div className="mb-6">
                <Button
                  variant="outline"
                  onClick={handleLeaveTournament}
                  disabled={leaving}
                  className="w-full"
                >
                  {leaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Leaving...
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 mr-2" />
                      Leave Tournament
                    </>
                  )}
                </Button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
