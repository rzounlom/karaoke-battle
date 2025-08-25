export interface Song {
  id: string;
  title: string;
  artist: string;
  audioFile: string; // path to mp3 file
  lrcFile: string; // path to lrc file
  duration?: number; // in seconds, calculated from LRC file
  genre?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  year?: number;
}

export interface SongWithDuration extends Song {
  duration: number;
}

// Available songs based on files in public/audio folder
export const availableSongs: Song[] = [
  {
    id: "bohemian-rhapsody",
    title: "Bohemian Rhapsody",
    artist: "Queen",
    audioFile: "/audio/bohemian-rhapsody.mp3",
    lrcFile: "/audio/bohemian-rhapsody.lrc",
    genre: "Rock",
    difficulty: "Hard",
    year: 1975,
  },
  {
    id: "cant-stop-the-feeling",
    title: "Can't Stop the Feeling!",
    artist: "Justin Timberlake",
    audioFile: "/audio/cant-stop-the-feeling.mp3",
    lrcFile: "/audio/cant-stop-the-feeling.lrc",
    genre: "Pop",
    difficulty: "Medium",
    year: 2016,
  },
  {
    id: "hotel-california",
    title: "Hotel California",
    artist: "Eagles",
    audioFile: "/audio/hotel-california.mp3",
    lrcFile: "/audio/hotel-california.lrc",
    genre: "Rock",
    difficulty: "Medium",
    year: 1976,
  },
  {
    id: "rock-with-you",
    title: "Rock with You",
    artist: "Michael Jackson",
    audioFile: "/audio/rock-with-you.mp3",
    lrcFile: "/audio/rock-with-you.lrc",
    genre: "Pop",
    difficulty: "Medium",
    year: 1979,
  },
  {
    id: "wonderwall",
    title: "Wonderwall",
    artist: "Oasis",
    audioFile: "/audio/wonderwall.mp3",
    lrcFile: "/audio/wonderwall.lrc",
    genre: "Rock",
    difficulty: "Easy",
    year: 1995,
  },
];

// Note: billie-jean.lrc exists but no corresponding mp3 file
// Only including songs that have both audio and lyrics files

/**
 * Get song by ID
 */
export function getSongById(id: string): Song | undefined {
  return availableSongs.find((song) => song.id === id);
}

/**
 * Get all available songs
 */
export function getAllSongs(): Song[] {
  return availableSongs;
}

/**
 * Filter songs by criteria
 */
export function filterSongs(criteria: {
  genre?: string;
  difficulty?: string;
  searchTerm?: string;
}): Song[] {
  return availableSongs.filter((song) => {
    const matchesGenre =
      !criteria.genre ||
      criteria.genre === "All" ||
      song.genre === criteria.genre;
    const matchesDifficulty =
      !criteria.difficulty ||
      criteria.difficulty === "All" ||
      song.difficulty === criteria.difficulty;
    const matchesSearch =
      !criteria.searchTerm ||
      song.title.toLowerCase().includes(criteria.searchTerm.toLowerCase()) ||
      song.artist.toLowerCase().includes(criteria.searchTerm.toLowerCase());

    return matchesGenre && matchesDifficulty && matchesSearch;
  });
}

/**
 * Get unique genres from available songs
 */
export function getAvailableGenres(): string[] {
  const genres = new Set(
    availableSongs
      .map((song) => song.genre)
      .filter((genre): genre is string => Boolean(genre))
  );
  return ["All", ...Array.from(genres).sort()];
}

/**
 * Get unique difficulties from available songs
 */
export function getAvailableDifficulties(): string[] {
  const difficulties = new Set(
    availableSongs
      .map((song) => song.difficulty)
      .filter((difficulty): difficulty is "Easy" | "Medium" | "Hard" =>
        Boolean(difficulty)
      )
  );
  return ["All", ...Array.from(difficulties).sort()];
}

/**
 * Load song durations from LRC files
 */
export async function loadSongDurations(): Promise<SongWithDuration[]> {
  const { fetchLrcDuration } = await import("./lrc-parser");

  const songsWithDurations = await Promise.all(
    availableSongs.map(async (song) => {
      const duration = await fetchLrcDuration(song.lrcFile);
      return {
        ...song,
        duration,
      } as SongWithDuration;
    })
  );

  return songsWithDurations;
}
