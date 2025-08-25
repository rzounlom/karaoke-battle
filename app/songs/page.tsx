"use client";

import {
  ArrowLeft,
  Clock,
  Filter,
  Mic,
  Play,
  Search,
  Star,
  Users,
} from "lucide-react";
import {
  Song,
  SongWithDuration,
  filterSongs,
  getAllSongs,
  getAvailableDifficulties,
  getAvailableGenres,
  loadSongDurations,
} from "@/lib/songs-data";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfile } from "@/components/user-profile";

const sortOptions = ["Title", "Artist", "Newest", "Genre"];

export default function SongsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [sortBy, setSortBy] = useState("Title");
  const [selectedSong, setSelectedSong] = useState<SongWithDuration | null>(
    null
  );
  const [songsWithDurations, setSongsWithDurations] = useState<
    SongWithDuration[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Get data from the new songs system
  const allSongs = getAllSongs();
  const genres = getAvailableGenres();
  const difficulties = getAvailableDifficulties();

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        {/* Header */}
        <header className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold karaoke-text-gradient">
              Choose Your Song
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
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold karaoke-text-gradient">
            Choose Your Song
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <UserProfile />
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Song List */}
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
            <div className="grid md:grid-cols-2 gap-4">
              {filteredSongs.map((song) => (
                <div
                  key={song.id}
                  onClick={() => setSelectedSong(song)}
                  className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border-2 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                    selectedSong?.id === song.id
                      ? "border-purple-500 shadow-lg scale-[1.02]"
                      : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {song.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 truncate">
                        {song.artist}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <Mic className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium text-purple-600">
                        Available
                      </span>
                    </div>
                  </div>

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
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      {song.genre && (
                        <>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {song.genre}
                          </span>
                        </>
                      )}
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

          {/* Song Preview */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700 sticky top-6">
              {selectedSong ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                      {selectedSong.title}
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                      {selectedSong.artist}
                    </p>

                    <div className="flex items-center justify-center space-x-4 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {selectedSong.year || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">Year</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {selectedSong.genre || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">Genre</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {formatDuration(selectedSong.duration)}
                        </div>
                        <div className="text-sm text-gray-500">Duration</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Link href={`/game-mode?songId=${selectedSong.id}`}>
                      <Button variant="karaoke" className="w-full py-3">
                        <Play className="mr-2 h-5 w-5" />
                        Start Battle
                      </Button>
                    </Link>
                    <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                      🎵 Audio & Lyrics Ready
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Song Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Genre:</span>
                        <span className="text-gray-900 dark:text-white">
                          {selectedSong.genre}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Difficulty:</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(
                            selectedSong.difficulty || "medium"
                          )}`}
                        >
                          {selectedSong.difficulty || "Medium"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Year:</span>
                        <span className="text-gray-900 dark:text-white">
                          {selectedSong.year}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a song to preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
