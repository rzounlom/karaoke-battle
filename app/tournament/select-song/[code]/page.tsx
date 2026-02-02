"use client";

import { Clock, Loader2, Music, Search } from "lucide-react";
import { getAllSongs, Song } from "@/lib/songs-data";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { toast } from "@/lib/toast";
import { useUser } from "@clerk/nextjs";

interface CurrentTurn {
  id: string;
  turnNumber: number;
  participant: {
    id: string;
    displayName: string;
    turnOrder: number;
  };
  song: {
    id: string;
    title: string;
    artist: string;
  } | null;
  status: string;
  timeRemaining: number | null;
}

export default function TournamentSelectSongPage() {
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

  const [currentTurn, setCurrentTurn] = useState<CurrentTurn | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);

  const allSongs = getAllSongs();

  // Filter songs based on search
  const filteredSongs = allSongs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (sessionCode) {
      loadCurrentTurn();
      // Check for stored participant ID (for guests)
      if (!isSignedIn && typeof window !== "undefined") {
        const storedId = sessionStorage.getItem(
          `tournament_${sessionCode}_participantId`
        );
        if (storedId) {
          setCurrentParticipantId(storedId);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode, isSignedIn]);

  // Fetch current user's participant ID if signed in
  useEffect(() => {
    const fetchParticipantId = async () => {
      if (isSignedIn && sessionCode) {
        try {
          const response = await fetch("/api/user/profile");
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              // Get session to find participant
              const sessionResponse = await fetch(
                `/api/tournament/session/${sessionCode}`
              );
              if (sessionResponse.ok) {
                const sessionData = await sessionResponse.json();
                if (sessionData.success) {
                  const participant = sessionData.session.participants.find(
                    (p: { user?: { id: string } | null }) =>
                      p.user?.id === data.user.id
                  );
                  if (participant) {
                    setCurrentParticipantId(participant.id);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Error fetching participant ID:", error);
        }
      }
    };

    fetchParticipantId();
  }, [isSignedIn, sessionCode]);

  // Poll for current turn
  useEffect(() => {
    if (!sessionCode) return;

    const interval = setInterval(() => {
      loadCurrentTurn();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          // Time expired - reload turn to check status
          loadCurrentTurn();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const loadCurrentTurn = async () => {
    if (!sessionCode) {
      setLoading(false);
      return;
    }

    try {
      const participantIdParam = currentParticipantId
        ? `&participantId=${currentParticipantId}`
        : "";

      const response = await fetch(
        `/api/tournament/turn/current?sessionCode=${sessionCode}${participantIdParam}`
      );
      const data = await response.json();

      if (data.success) {
        setCurrentTurn(data.turn);
        setTimeRemaining(data.turn.timeRemaining);

        // If it's not my turn or turn is not PENDING, redirect
        if (!data.isMyTurn || data.turn.status !== "PENDING") {
          if (data.turn.status === "IN_PROGRESS" && data.isMyTurn) {
            // Song already selected, redirect to gameplay
            router.push(
              `/gameplay?tournamentSession=${sessionCode}&turnId=${data.turn.id}&songId=${data.turn.song?.id}`
            );
          } else {
            // Not my turn or turn completed, go back to lobby
            router.push(`/tournament/lobby/${sessionCode}`);
          }
          return;
        }
      } else {
        toast.error(data.message || "Failed to load turn");
        router.push(`/tournament/lobby/${sessionCode}`);
      }
    } catch (error) {
      console.error("Error loading current turn:", error);
      toast.error("Failed to load turn", "Please try again.");
      router.push(`/tournament/lobby/${sessionCode}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSong = async () => {
    if (!selectedSong || !currentTurn || !sessionCode) return;

    setSelecting(true);
    try {
      const participantIdParam = currentParticipantId
        ? { participantId: currentParticipantId }
        : {};

      const response = await fetch("/api/tournament/turn/select-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionCode,
          turnId: currentTurn.id,
          songId: selectedSong.id,
          ...participantIdParam,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Song selected!", "Starting gameplay...");
        // Redirect to gameplay with tournament context
        router.push(
          `/gameplay?tournamentSession=${sessionCode}&turnId=${currentTurn.id}&songId=${selectedSong.id}`
        );
      } else {
        toast.error(data.message || "Failed to select song");
        // Reload turn in case status changed
        loadCurrentTurn();
      }
    } catch (error) {
      console.error("Error selecting song:", error);
      toast.error("Failed to select song", "Please try again.");
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <PageHeader />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600 dark:text-gray-400">
              Loading your turn...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentTurn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <PageHeader />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <Music className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-2">No Active Turn</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Waiting for your turn...
            </p>
            <Button onClick={() => router.push(`/tournament/lobby/${sessionCode}`)}>
              Back to Lobby
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      <PageHeader />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 mb-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Your Turn!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Select a song to perform (Turn {currentTurn.turnNumber})
            </p>
            {timeRemaining !== null && timeRemaining > 0 && (
              <div className="flex items-center justify-center gap-2 text-lg font-semibold">
                <Clock className="h-5 w-5 text-orange-500" />
                <span
                  className={
                    timeRemaining <= 10
                      ? "text-red-600 dark:text-red-400"
                      : "text-gray-900 dark:text-white"
                  }
                >
                  {Math.floor(timeRemaining / 60)}:
                  {String(timeRemaining % 60).padStart(2, "0")}
                </span>
              </div>
            )}
            {timeRemaining === 0 && (
              <p className="text-red-600 dark:text-red-400 font-semibold">
                Time expired! Your turn will be skipped.
              </p>
            )}
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search songs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Song List */}
          <div className="max-h-[60vh] overflow-y-auto mb-6">
            {filteredSongs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  No songs found matching &quot;{searchTerm}&quot;
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSongs.map((song) => (
                  <Card
                    key={song.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedSong?.id === song.id
                        ? "ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                    onClick={() => setSelectedSong(song)}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate text-gray-900 dark:text-white">
                            {song.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 truncate">
                            {song.artist}
                          </p>
                        </div>
                        {selectedSong?.id === song.id && (
                          <div className="ml-2">
                            <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          </div>
                        )}
                      </div>
                      {song.genre && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {song.genre}
                        </p>
                      )}
                      {song.difficulty && (
                        <span
                          className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                            song.difficulty === "Easy"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : song.difficulty === "Medium"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {song.difficulty}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Select Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleSelectSong}
              disabled={!selectedSong || selecting || timeRemaining === 0}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              size="lg"
            >
              {selecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Selecting...
                </>
              ) : (
                <>
                  <Music className="h-4 w-4 mr-2" />
                  Select Song & Start
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

