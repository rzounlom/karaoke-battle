"use client";

import { Clock, History, Mic, Play, Search, Settings } from "lucide-react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import {
  SongWithDuration,
  getAllSongs,
  getAvailableDifficulties,
  getAvailableGenres,
  loadSongDurations,
} from "@/lib/songs-data";
import { Suspense, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { GameModeModal } from "@/components/game-mode-modal";
import { MultiplayerFriendModal } from "@/components/multiplayer-friend-modal";
import { PageHeader } from "@/components/page-header";
import { useUser } from "@clerk/nextjs";

const sortOptions = ["Title", "Artist", "Newest", "Genre"];

function SongsPageContent() {
  const { isSignedIn, isLoaded } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [sortBy, setSortBy] = useState("Title");
  const [showModeModal, setShowModeModal] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<SongWithDuration | null>(
    null
  );
  const [songsWithDurations, setSongsWithDurations] = useState<
    SongWithDuration[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [recentSongs, setRecentSongs] = useState<
    Array<{
      id: string;
      songId: string;
      gameMode: string;
      status: string;
      score: number;
      completedAt: string;
      song: {
        id: string;
        title: string;
        artist: string;
        genre?: string;
        difficulty?: string;
      } | null;
    }>
  >([]);
  const [recentSongsLoading, setRecentSongsLoading] = useState(true);

  // Wizard state
  const [runWizard, setRunWizard] = useState(false);
  const [wizardLoading, setWizardLoading] = useState(true);
  const [devModeWizardEnabled, setDevModeWizardEnabled] = useState(false);
  const [showModalWizard, setShowModalWizard] = useState(false);

  // Get data from the new songs system
  const allSongs = getAllSongs();
  const genres = getAvailableGenres();
  const difficulties = getAvailableDifficulties();

  const fetchRecentSongs = async () => {
    // Only fetch if user is authenticated
    if (!isLoaded || !isSignedIn) {
      setRecentSongsLoading(false);
      setRecentSongs([]);
      return;
    }

    try {
      setRecentSongsLoading(true);
      const response = await fetch("/api/user/recent-songs");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // The API now includes song details, so we can use them directly
          const recentSongsWithDetails = data.recentSessions.filter(
            (session: {
              id: string;
              songId: string;
              gameMode: string;
              status: string;
              score: number;
              completedAt: string;
              song: {
                id: string;
                title: string;
                artist: string;
                genre?: string;
                difficulty?: string;
              } | null;
            }) => session.song // Filter out any sessions without song data
          );

          setRecentSongs(recentSongsWithDetails);
        }
      }
    } catch (error) {
      console.error("Failed to fetch recent songs:", error);
      // Set empty array on error
      setRecentSongs([]);
    } finally {
      setRecentSongsLoading(false);
    }
  };

  // Load song durations on component mount
  useEffect(() => {
    const loadDurations = async () => {
      setLoading(true);
      try {
        const songsWithDurations = await loadSongDurations();
        setSongsWithDurations(songsWithDurations);
      } catch (error) {
        console.error("Failed to load song durations:", error);
        // Fallback to songs without durations
        setSongsWithDurations(
          allSongs.map((song) => ({ ...song, duration: 0 }))
        );
      } finally {
        setLoading(false);
      }
    };

    loadDurations();
  }, [allSongs]);

  // Fetch recent songs when authentication state changes
  useEffect(() => {
    if (!isLoaded) {
      return; // Still loading auth state
    }

    if (isSignedIn) {
      // User is signed in, fetch recent songs
      fetchRecentSongs();
      // Check if user has completed first session
      checkFirstSessionStatus();
    } else {
      // User is not signed in, set loading to false and empty array
      setRecentSongsLoading(false);
      setRecentSongs([]);
      setWizardLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  // Check if user has completed first session
  const checkFirstSessionStatus = async () => {
    try {
      const response = await fetch("/api/user/first-session");
      const data = await response.json();
      if (data.success) {
        // In dev mode, check localStorage for override
        if (process.env.NODE_ENV === "development") {
          const devOverride = localStorage.getItem("dev-wizard-enabled");
          if (devOverride === "true") {
            setRunWizard(true);
            setDevModeWizardEnabled(true);
          } else if (!data.hasCompletedFirstSession) {
            setRunWizard(true);
          }
        } else if (!data.hasCompletedFirstSession) {
          setRunWizard(true);
        }
      }
    } catch (error) {
      console.error("Error checking first session status:", error);
    } finally {
      setWizardLoading(false);
    }
  };

  // Wizard steps for main page (steps 1-2)
  const mainWizardSteps: Step[] = [
    {
      target: "[data-tour='search']",
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2">Search for Songs</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Use the search bar to find songs by title or artist. You can also
            filter by genre and difficulty using the dropdowns below.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: "[data-tour='song-card']",
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2">Select a Song</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Click on any song card to open the game mode selection. Each card
            shows the song title, artist, difficulty, and duration.
          </p>
        </div>
      ),
      placement: "top",
    },
  ];

  // Wizard step for modal (step 3)
  const modalWizardStep: Step[] = [
    {
      target: "[data-tour='mode-selection']",
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2">Choose Your Game Mode</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            When you click a song, you&apos;ll see three game modes:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>
              <strong>Single Player:</strong> Practice on your own and improve
              your score
            </li>
            <li>
              <strong>Multiplayer:</strong> Challenge your friends to a battle
            </li>
            <li>
              <strong>Tournament:</strong> Compete in organized competitions
            </li>
          </ul>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
  ];

  const filteredSongs = songsWithDurations
    .filter((song) => {
      const matchesGenre =
        selectedGenre === "All" || song.genre === selectedGenre;
      const matchesDifficulty =
        selectedDifficulty === "All" || song.difficulty === selectedDifficulty;
      const matchesSearch =
        !searchTerm ||
        song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesGenre && matchesDifficulty && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "Title":
          return a.title.localeCompare(b.title);
        case "Artist":
          return a.artist.localeCompare(b.artist);
        case "Newest":
          return (b.year || 0) - (a.year || 0);
        case "Genre":
          return (a.genre || "").localeCompare(b.genre || "");
        default:
          return 0;
      }
    });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-600 bg-green-100 dark:bg-green-900/30";
      case "Medium":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
      case "Hard":
        return "text-red-600 bg-red-100 dark:bg-red-900/30";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-900/30";
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle wizard callback for main steps - defined after filteredSongs
  const handleMainWizardCallback = useCallback(
    (data: CallBackProps) => {
      const { status, index, type, action } = data;

      // If we're moving forward from step 2, open the modal for step 3
      if (
        type === "step:after" &&
        typeof index === "number" &&
        action === "next" &&
        index === 1 &&
        filteredSongs.length > 0 &&
        !showModeModal
      ) {
        // Stop main wizard and open modal for step 3
        setRunWizard(false);
        setTimeout(() => {
          const firstSong = filteredSongs[0];
          setSelectedSong(firstSong);
          setShowModeModal(true);
          // Start modal wizard after modal renders
          setTimeout(() => {
            setShowModalWizard(true);
          }, 500);
        }, 300);
      }

      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRunWizard(false);
        // Mark first session as completed (unless in dev mode with override)
        if (!devModeWizardEnabled && isSignedIn) {
          fetch("/api/user/first-session", { method: "POST" }).catch(
            console.error
          );
        }
      }
    },
    [devModeWizardEnabled, isSignedIn, filteredSongs, showModeModal]
  );

  // Handle wizard callback for modal step
  const handleModalWizardCallback = useCallback(
    (data: CallBackProps) => {
      const { status } = data;

      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setShowModalWizard(false);
        // Close modal if it was opened for the wizard
        if (showModeModal && selectedSong) {
          setShowModeModal(false);
          setSelectedSong(null);
        }
        // Mark first session as completed (unless in dev mode with override)
        if (!devModeWizardEnabled && isSignedIn) {
          fetch("/api/user/first-session", { method: "POST" }).catch(
            console.error
          );
        }
      }
    },
    [devModeWizardEnabled, isSignedIn, showModeModal, selectedSong]
  );

  const handleSongSelect = (song: SongWithDuration) => {
    setSelectedSong(song);
    setShowModeModal(true);
  };

  const handleCloseModal = () => {
    setShowModeModal(false);
    setSelectedSong(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <PageHeader
          title="Karaoke Battle"
          showBackButton={true}
          backHref="/"
          showNavigation={true}
        />

        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">
                Loading song durations...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      <PageHeader
        title="Karaoke Battle"
        showBackButton={true}
        backHref="/"
        showNavigation={true}
      />

      <div className="container mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold karaoke-text-gradient mb-2">
            Choose Your Song
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Select a song and game mode to start your karaoke battle
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search and Filters */}
            <div className="space-y-4">
              <div className="relative" data-tour="search">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search songs or artists..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500"
                >
                  {genres.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500"
                >
                  {difficulties.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500"
                >
                  {sortOptions.map((option) => (
                    <option key={option} value={option}>
                      Sort by: {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                {filteredSongs.length} songs found
                {loading && " (loading durations...)"}
              </div>
            </div>

            {/* Song Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSongs.map((song, index) => (
                <div
                  key={song.id}
                  data-tour={index === 0 ? "song-card" : undefined}
                  onClick={() => handleSongSelect(song)}
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border-2 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-gray-200 dark:border-gray-700 hover:border-purple-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate text-gray-900 dark:text-white">
                        {song.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 truncate">
                        {song.artist}
                      </p>
                      {song.year && (
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          {song.year}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <Mic className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium text-purple-600">
                        Ready
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {song.difficulty && (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(
                              song.difficulty
                            )}`}
                          >
                            {song.difficulty}
                          </span>
                        )}
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(song.duration)}</span>
                        </div>
                      </div>
                      {song.genre && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-400">
                          {song.genre}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-center">
                      <Button
                        variant="karaoke"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSongSelect(song);
                        }}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Play Song
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredSongs.length === 0 && (
              <div className="text-center py-12">
                <Mic className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">
                  No songs found matching your criteria
                </p>
              </div>
            )}
          </div>

          {/* Recent Songs Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700 sticky top-6">
              <div className="flex items-center space-x-2 mb-4">
                <History className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Songs
                </h3>
              </div>

              {recentSongsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">
                    Loading recent songs...
                  </p>
                </div>
              ) : recentSongs.length > 0 ? (
                <div className="space-y-4">
                  {recentSongs.map((recentSong) => (
                    <div
                      key={recentSong.id}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                            {recentSong.song?.title}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {recentSong.song?.artist}
                          </p>
                        </div>
                        <div className="ml-2 text-right">
                          <div className="text-sm font-bold text-purple-600">
                            {recentSong.score}
                          </div>
                          <div className="text-xs text-gray-500">Score</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-2 py-1 rounded">
                            {recentSong.gameMode.replace("_", " ")}
                          </span>
                          {recentSong.song?.genre && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                              {recentSong.song.genre}
                            </span>
                          )}
                          {recentSong.song?.difficulty && (
                            <span
                              className={`text-xs px-2 py-1 rounded ${getDifficultyColor(
                                recentSong.song.difficulty
                              )}`}
                            >
                              {recentSong.song.difficulty}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(
                            recentSong.completedAt
                          ).toLocaleDateString()}
                        </span>
                      </div>

                      <Button
                        variant="karaoke"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          // Find the song by customId (which is what the API returns)
                          if (recentSong.song) {
                            const songWithDuration = songsWithDurations.find(
                              (s) => s.id === recentSong.song!.id
                            );
                            if (songWithDuration) {
                              handleSongSelect(songWithDuration);
                            }
                          }
                        }}
                      >
                        <Play className="mr-2 h-3 w-3" />
                        Play Again
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No recent songs yet. Complete a song to see it here!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Game Mode Modal */}
      {selectedSong && (
        <GameModeModal
          isOpen={showModeModal}
          onClose={handleCloseModal}
          onMultiplayerSelect={() => {
            setShowModeModal(false);
            setShowFriendModal(true);
          }}
          songId={selectedSong.id}
          songTitle={selectedSong.title}
          songArtist={selectedSong.artist}
        />
      )}

      {/* Multiplayer Friend Selection Modal */}
      {selectedSong && (
        <MultiplayerFriendModal
          isOpen={showFriendModal}
          onClose={() => {
            setShowFriendModal(false);
            setSelectedSong(null);
          }}
          songId={selectedSong.id}
          songTitle={selectedSong.title}
          songArtist={selectedSong.artist}
        />
      )}

      {/* Dev Mode Wizard Toggle */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newState = !devModeWizardEnabled;
              setDevModeWizardEnabled(newState);
              localStorage.setItem("dev-wizard-enabled", String(newState));
              setRunWizard(newState);
            }}
            className="bg-white dark:bg-gray-800 shadow-lg"
          >
            <Settings className="h-4 w-4 mr-2" />
            {devModeWizardEnabled ? "Disable" : "Enable"} Wizard
          </Button>
        </div>
      )}

      {/* Main Wizard (Steps 1-2) */}
      {!wizardLoading && (
        <Joyride
          steps={mainWizardSteps}
          run={runWizard && !showModeModal}
          continuous={true}
          showProgress={true}
          showSkipButton={true}
          callback={handleMainWizardCallback}
          spotlightClicks={true}
          styles={{
            options: {
              primaryColor: "#9333ea", // purple-600
              zIndex: 10000,
            },
            tooltip: {
              borderRadius: "12px",
              padding: "20px",
            },
            buttonNext: {
              backgroundColor: "#9333ea",
              borderRadius: "8px",
              padding: "10px 20px",
            },
            buttonBack: {
              color: "#6b7280",
              marginRight: "10px",
            },
            buttonSkip: {
              color: "#6b7280",
            },
          }}
          locale={{
            back: "Back",
            close: "Close",
            last: "Next",
            next: "Next",
            skip: "Skip Tour",
          }}
        />
      )}

      {/* Modal Wizard (Step 3) */}
      {showModeModal && !wizardLoading && (
        <Joyride
          steps={modalWizardStep}
          run={showModalWizard}
          continuous={true}
          showProgress={false}
          showSkipButton={true}
          callback={handleModalWizardCallback}
          spotlightClicks={true}
          styles={{
            options: {
              primaryColor: "#9333ea", // purple-600
              zIndex: 10001, // Higher than modal
            },
            tooltip: {
              borderRadius: "12px",
              padding: "20px",
            },
            buttonNext: {
              backgroundColor: "#9333ea",
              borderRadius: "8px",
              padding: "10px 20px",
            },
            buttonBack: {
              color: "#6b7280",
              marginRight: "10px",
            },
            buttonSkip: {
              color: "#6b7280",
            },
          }}
          locale={{
            back: "Back",
            close: "Close",
            last: "Finish",
            next: "Next",
            skip: "Skip Tour",
          }}
        />
      )}
    </div>
  );
}

export default function SongsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <SongsPageContent />
    </Suspense>
  );
}
