"use client";

import { ArrowLeft, Clock, History, Mic, Play, Search } from "lucide-react";
import {
  SongWithDuration,
  getAllSongs,
  getAvailableDifficulties,
  getAvailableGenres,
  getSongById,
  loadSongDurations,
} from "@/lib/songs-data";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfile } from "@/components/user-profile";

const sortOptions = ["Title", "Artist", "Newest", "Genre"];

function SongsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameMode = searchParams.get("mode") || "single";

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [sortBy, setSortBy] = useState("Title");
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
      };
    }>
  >([]);
  const [recentSongsLoading, setRecentSongsLoading] = useState(true);

  // Get data from the new songs system
  const allSongs = getAllSongs();
  const genres = getAvailableGenres();
  const difficulties = getAvailableDifficulties();

  // Load song durations and recent songs on component mount
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
    fetchRecentSongs();
  }, [allSongs]);

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

  const handleSongSelect = (song: SongWithDuration) => {
    // Navigate directly to gameplay with the selected song and game mode
    router.push(`/gameplay?songId=${song.id}&mode=${gameMode}`);
  };

  const fetchRecentSongs = async () => {
    try {
      setRecentSongsLoading(true);
      const response = await fetch("/api/user/recent-songs");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Get song details for each recent session
          const recentSongsWithDetails = data.recentSessions
            .map(
              (session: {
                id: string;
                songId: string;
                gameMode: string;
                status: string;
                score: number;
                completedAt: string;
              }) => {
                const song = getSongById(session.songId);
                return {
                  ...session,
                  song: song,
                };
              }
            )
            .filter(
              (item: {
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
                } | null;
              }) => item.song
            ); // Filter out any songs that weren't found

          setRecentSongs(recentSongsWithDetails);
        }
      }
    } catch (error) {
      console.error("Failed to fetch recent songs:", error);
    } finally {
      setRecentSongsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        {/* Header */}
        <header className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Link href="/game-mode">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold karaoke-text-gradient">
              Choose Your Song -{" "}
              {gameMode === "single"
                ? "Single Player"
                : gameMode === "multiplayer"
                ? "Multiplayer"
                : "Tournament"}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <UserProfile />
            <ThemeToggle />
          </div>
        </header>

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
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <Link href="/game-mode">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold karaoke-text-gradient">
            Choose Your Song -{" "}
            {gameMode === "single"
              ? "Single Player"
              : gameMode === "multiplayer"
              ? "Multiplayer"
              : "Tournament"}
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <UserProfile />
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search and Filters */}
            <div className="space-y-4">
              <div className="relative">
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
              {filteredSongs.map((song) => (
                <div
                  key={song.id}
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
                        {gameMode === "single"
                          ? "Play & Level Up"
                          : gameMode === "multiplayer"
                          ? "Start Battle"
                          : "Start Tournament"}
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
                            {recentSong.song.title}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {recentSong.song.artist}
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
                          <span className="text-xs text-gray-500">
                            {new Date(
                              recentSong.completedAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="karaoke"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const songWithDuration = songsWithDurations.find(
                            (s) => s.id === recentSong.song.id
                          );
                          if (songWithDuration) {
                            handleSongSelect(songWithDuration);
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
