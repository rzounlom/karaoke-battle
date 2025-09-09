import {
  ParsedLrc,
  getCurrentLyric,
  getUpcomingLyrics,
  lrcToWords,
  parseLrc,
} from "./lrc-parser";

import { Song } from "./songs-data";

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
}

export class AudioPlayer {
  private audio: HTMLAudioElement;
  private parsedLrc: ParsedLrc | null = null;
  private currentSong: Song | null = null;
  private onTimeUpdate: ((currentTime: number) => void) | null = null;
  private onPlay: (() => void) | null = null;
  private onPause: (() => void) | null = null;
  private onEnded: (() => void) | null = null;
  private onLyricsLoaded: ((parsedLrc: ParsedLrc) => void) | null = null;
  private instanceId: string;

  constructor() {
    this.instanceId = `AudioPlayer_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.audio.volume = 0.8; // Set default volume
    this.audio.crossOrigin = "anonymous"; // In case of CORS issues
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.audio.addEventListener("timeupdate", () => {
      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.audio.currentTime * 1000); // Convert to milliseconds
      }
    });

    this.audio.addEventListener("play", () => {
      if (this.onPlay) this.onPlay();
    });

    this.audio.addEventListener("pause", () => {
      if (this.onPause) this.onPause();
    });

    this.audio.addEventListener("ended", () => {
      if (this.onEnded) this.onEnded();
    });

    this.audio.addEventListener("error", (e) => {
      // Error handling - only log when debug buttons are clicked
    });

    this.audio.addEventListener("loadstart", () => {
      // Reduced logging
    });

    this.audio.addEventListener("loadedmetadata", () => {
      // Reduced logging
    });

    this.audio.addEventListener("loadeddata", () => {
      // Reduced logging
    });

    this.audio.addEventListener("canplay", () => {
      // Reduced logging
    });

    this.audio.addEventListener("canplaythrough", () => {
      // Can play through
    });

    this.audio.addEventListener("stalled", () => {
      // Loading stalled - only log when debug buttons are clicked
    });

    this.audio.addEventListener("waiting", () => {
      // Waiting for data
    });
  }

  async loadSong(song: Song): Promise<void> {
    if (!song) {
      throw new Error("No song provided to loadSong");
    }

    if (!song.audioFile) {
      throw new Error(`Song "${song.title}" has no audioFile specified`);
    }

    this.currentSong = song;

    // Load audio file first
    try {
      await this.loadAudio(song.audioFile);
    } catch (audioError) {
      throw new Error(
        `Cannot load audio file: ${
          audioError instanceof Error ? audioError.message : audioError
        }`
      );
    }

    // Load and parse LRC file
    try {
      const lrcResponse = await fetch(song.lrcFile);
      if (!lrcResponse.ok) {
        throw new Error(
          `Failed to load LRC file: ${lrcResponse.status} ${lrcResponse.statusText}`
        );
      }

      const lrcContent = await lrcResponse.text();
      this.parsedLrc = parseLrc(lrcContent);

      if (this.onLyricsLoaded) {
        this.onLyricsLoaded(this.parsedLrc);
      }
    } catch (error) {
      this.parsedLrc = null;
      // Don't throw here - lyrics are optional, audio is required
    }
  }

  private loadAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!audioUrl || audioUrl.trim() === "") {
        const error = new Error("Invalid audio URL provided");
        reject(error);
        return;
      }

      // Ensure the URL is absolute or properly formatted
      let finalUrl = audioUrl;
      if (audioUrl.startsWith("/")) {
        // Convert relative path to absolute URL
        finalUrl = `${window.location.origin}${audioUrl}`;
      }

      // Clear any existing source and reset audio element
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.src = finalUrl;

      // Set up one-time event listeners for this load operation
      const onMetadataLoaded = () => {
        // Validate duration
        if (
          !this.audio.duration ||
          isNaN(this.audio.duration) ||
          this.audio.duration <= 0
        ) {
          const error = new Error(
            `Invalid audio duration: ${this.audio.duration}`
          );
          cleanup();
          reject(error);
          return;
        }

        cleanup();
        resolve();
      };

      const onError = (e: Event) => {
        const errorMsg = `Failed to load audio from ${finalUrl}. Check if file exists and is accessible.`;
        cleanup();
        reject(new Error(errorMsg));
      };

      const onLoadStart = () => {
        // Load started
      };

      const cleanup = () => {
        this.audio.removeEventListener("loadedmetadata", onMetadataLoaded);
        this.audio.removeEventListener("error", onError);
        this.audio.removeEventListener("loadstart", onLoadStart);
      };

      this.audio.addEventListener("loadedmetadata", onMetadataLoaded, {
        once: true,
      });
      this.audio.addEventListener("error", onError, { once: true });
      this.audio.addEventListener("loadstart", onLoadStart, { once: true });

      // Check if metadata is already loaded (race condition)
      if (
        this.audio.duration &&
        !isNaN(this.audio.duration) &&
        this.audio.duration > 0 &&
        this.audio.readyState >= 2
      ) {
        cleanup();
        resolve();
        return;
      }

      // Start loading
      this.audio.load();
    });
  }

  play(): Promise<void> {
    if (!this.audio.src) {
      const error = new Error("No audio source loaded");
      return Promise.reject(error);
    }

    // Check if audio is in an error state
    if (this.audio.error) {
      const error = new Error(
        `Audio is in error state: ${this.audio.error.message}`
      );
      return Promise.reject(error);
    }

    // For readyState 0 (HAVE_NOTHING), wait a bit and try again
    if (this.audio.readyState === 0) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout waiting for audio to load"));
        }, 5000);

        const onCanPlay = () => {
          clearTimeout(timeout);
          this.audio.removeEventListener("canplay", onCanPlay);
          this.audio.removeEventListener("error", onError);
          this.play().then(resolve).catch(reject);
        };

        const onError = () => {
          clearTimeout(timeout);
          this.audio.removeEventListener("canplay", onCanPlay);
          this.audio.removeEventListener("error", onError);
          reject(new Error("Audio failed to load while waiting to play"));
        };

        this.audio.addEventListener("canplay", onCanPlay, { once: true });
        this.audio.addEventListener("error", onError, { once: true });
      });
    }

    // Try to play
    return this.audio.play().catch((error) => {
      // Provide more helpful error messages
      if (error.name === "NotAllowedError") {
        throw new Error("Browser blocked autoplay. User interaction required.");
      } else if (error.name === "NotSupportedError") {
        throw new Error("Audio format not supported by browser.");
      } else {
        throw error;
      }
    });
  }

  pause(): void {
    this.audio.pause();
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  seek(time: number): void {
    this.audio.currentTime = time / 1000; // Convert from milliseconds to seconds
  }

  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  mute(): void {
    this.audio.muted = true;
  }

  unmute(): void {
    this.audio.muted = false;
  }

  getState(): AudioPlayerState {
    return {
      isPlaying: !this.audio.paused,
      currentTime: this.audio.currentTime * 1000, // Convert to milliseconds
      duration: this.audio.duration, // Keep in seconds (UI expects seconds)
      volume: this.audio.volume,
      isMuted: this.audio.muted,
    };
  }

  // Lyrics methods
  getCurrentLyric(): string | null {
    if (!this.parsedLrc) return null;
    const currentLyric = getCurrentLyric(
      this.parsedLrc,
      this.audio.currentTime * 1000
    );
    return currentLyric ? currentLyric.text : null;
  }

  getUpcomingLyrics(count: number = 3): string[] {
    if (!this.parsedLrc) return [];
    const upcomingLyrics = getUpcomingLyrics(
      this.parsedLrc,
      this.audio.currentTime * 1000,
      count
    );
    return upcomingLyrics.map((lyric) => lyric.text);
  }

  getLyricsForScoring(): Array<{
    word: string;
    startTime: number;
    endTime: number;
  }> {
    if (!this.parsedLrc) return [];
    return lrcToWords(this.parsedLrc);
  }

  getCurrentSong(): Song | null {
    return this.currentSong;
  }

  getParsedLrc(): ParsedLrc | null {
    return this.parsedLrc;
  }

  isReadyToPlay(): boolean {
    const ready =
      this.audio.src !== "" &&
      this.audio.src !== window.location.href && // Not just the page URL
      this.audio.readyState >= 2 && // HAVE_CURRENT_DATA or higher
      !this.audio.error &&
      this.audio.duration > 0 && // Has valid duration
      !isNaN(this.audio.duration); // Duration is a valid number

    return ready;
  }

  getDebugInfo(): object {
    return {
      src: this.audio.src,
      readyState: this.audio.readyState,
      networkState: this.audio.networkState,
      duration: this.audio.duration,
      currentTime: this.audio.currentTime,
      paused: this.audio.paused,
      volume: this.audio.volume,
      muted: this.audio.muted,
      error: this.audio.error,
      isReadyToPlay: this.isReadyToPlay(),
      currentSong: this.currentSong?.title,
      lyricsLoaded: !!this.parsedLrc,
    };
  }

  // Debug method to check readiness with logging
  debugReadyToPlay(): boolean {
    const ready = this.isReadyToPlay();
    return ready;
  }

  // Event handlers
  onTimeUpdateCallback(callback: (currentTime: number) => void) {
    this.onTimeUpdate = callback;
  }

  onPlayCallback(callback: () => void) {
    this.onPlay = callback;
  }

  onPauseCallback(callback: () => void) {
    this.onPause = callback;
  }

  onEndedCallback(callback: () => void) {
    this.onEnded = callback;
  }

  onLyricsLoadedCallback(callback: (parsedLrc: ParsedLrc) => void) {
    this.onLyricsLoaded = callback;
  }

  private getErrorType(errorCode: number): string {
    switch (errorCode) {
      case 1:
        return "MEDIA_ERR_ABORTED";
      case 2:
        return "MEDIA_ERR_NETWORK";
      case 3:
        return "MEDIA_ERR_DECODE";
      case 4:
        return "MEDIA_ERR_SRC_NOT_SUPPORTED";
      default:
        return "UNKNOWN_ERROR";
    }
  }

  destroy(): void {
    this.audio.pause();
    // Don't set src to empty string or call load() - this causes the page URL issue
    // Just pause and remove references
    this.onTimeUpdate = null;
    this.onPlay = null;
    this.onPause = null;
    this.onEnded = null;
    this.onLyricsLoaded = null;
    this.currentSong = null;
    this.parsedLrc = null;
  }

  // Preload duration by playing briefly and pausing
  async preloadDuration(): Promise<number> {
    if (!this.audio.src) {
      throw new Error("No audio source loaded");
    }

    // If duration is already available, return it
    if (
      this.audio.duration &&
      !isNaN(this.audio.duration) &&
      this.audio.duration > 0
    ) {
      return this.audio.duration;
    }

    // Try to load metadata without playing
    try {
      // Set current time to 0 to ensure we're at the start
      this.audio.currentTime = 0;

      // Wait for metadata to load
      await new Promise<void>((resolve, reject) => {
        const onLoadedMetadata = () => {
          resolve();
        };

        const onError = (e: Event) => {
          reject(new Error("Failed to load metadata"));
        };

        const onTimeout = () => {
          reject(new Error("Timeout waiting for metadata"));
        };

        this.audio.addEventListener("loadedmetadata", onLoadedMetadata, {
          once: true,
        });
        this.audio.addEventListener("error", onError, { once: true });

        const timeout = setTimeout(onTimeout, 10000); // 10 second timeout

        // Start loading
        this.audio.load();

        // Clean up timeout
        const cleanup = () => {
          clearTimeout(timeout);
          this.audio.removeEventListener("loadedmetadata", onLoadedMetadata);
          this.audio.removeEventListener("error", onError);
        };

        // Set up cleanup for both success and error
        this.audio.addEventListener("loadedmetadata", cleanup, { once: true });
        this.audio.addEventListener("error", cleanup, { once: true });
      });

      // Check if duration is now available
      if (
        this.audio.duration &&
        !isNaN(this.audio.duration) &&
        this.audio.duration > 0
      ) {
        return this.audio.duration;
      } else {
        throw new Error("Duration not available after preload");
      }
    } catch (error) {
      throw error;
    }
  }
}

// Legacy function for backward compatibility
// New code should use the Song-based loadSong method
export const getAudioUrl = (songId: string): string | null => {
  // Map old IDs to new song IDs for backward compatibility
  const legacyIdMap: Record<string, string> = {
    "1": "/audio/bohemian-rhapsody.mp3",
    "2": "/audio/hotel-california.mp3",
    "3": "/audio/hotel-california.mp3",
    "4": "/audio/rock-with-you.mp3",
    "bohemian-rhapsody": "/audio/bohemian-rhapsody.mp3",
    "cant-stop-the-feeling": "/audio/cant-stop-the-feeling.mp3",
    "hotel-california": "/audio/hotel-california.mp3",
    "rock-with-you": "/audio/rock-with-you.mp3",
    wonderwall: "/audio/wonderwall.mp3",
  };

  return legacyIdMap[songId] || null;
};
