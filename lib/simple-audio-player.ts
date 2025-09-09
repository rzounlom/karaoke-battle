import {
  ParsedLrc,
  getCurrentLyric,
  getUpcomingLyrics,
  parseLrc,
} from "./lrc-parser";

import { Song } from "./songs-data";

export interface SimpleAudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isReady: boolean;
  error: string | null;
}

export class SimpleAudioPlayer {
  private audio: HTMLAudioElement;
  private currentSong: Song | null = null;
  private parsedLrc: ParsedLrc | null = null;
  private onTimeUpdate: ((currentTime: number) => void) | null = null;
  private onPlay: (() => void) | null = null;
  private onPause: (() => void) | null = null;
  private onEnded: (() => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  private onLyricsLoaded: ((parsedLrc: ParsedLrc) => void) | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.audio.volume = 0.8;
    this.audio.crossOrigin = "anonymous"; // Add CORS support
    this.setupEventListeners();
    console.log("🎵 Audio player created with element:", this.audio);
    console.log("🎵 Initial audio src:", this.audio.src);
    console.log("🎵 Initial ready state:", this.audio.readyState);
    console.log("🎵 Initial duration:", this.audio.duration);
  }

  private setupEventListeners() {
    this.audio.addEventListener("timeupdate", () => {
      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.audio.currentTime * 1000);
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

    // Remove the global error handler - we handle errors in loadSong method
    // this.audio.addEventListener("error", () => {
    //   const error = this.audio.error;
    //   const errorMessage = error
    //     ? `Audio error: ${error.message}`
    //     : "Unknown audio error";
    //   if (this.onError) {
    //     this.onError(errorMessage);
    //   }
    // });
  }

  async loadSong(song: Song): Promise<void> {
    return new Promise(async (resolve, reject) => {
      console.log("🎵 SimpleAudioPlayer.loadSong called with:", song);

      // Validate song object
      if (!song || !song.audioFile) {
        console.error("❌ Invalid song object:", song);
        reject(new Error("Invalid song object"));
        return;
      }

      this.currentSong = song;

      // Simple approach: just reset the existing audio element
      console.log("🎵 Resetting audio element for new song");
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.src = "";

      // Small delay to ensure reset is complete
      setTimeout(() => {
        this.audio.src = song.audioFile;
        console.log("🎵 Audio element reset with src:", this.audio.src);

        // Set up event listeners and start loading
        this.audio.addEventListener("loadedmetadata", onLoadedMetadata, {
          once: true,
        });
        this.audio.addEventListener("error", onError, { once: true });

        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error("Audio loading timeout"));
        }, 10000);

        const originalResolve = resolve;
        const originalReject = reject;

        resolve = () => {
          clearTimeout(timeout);
          originalResolve();
        };

        reject = (error: Error) => {
          clearTimeout(timeout);
          originalReject(error);
        };

        // Start loading
        console.log("🎵 About to call audio.load()");
        this.audio.load();

        // Check audio state immediately after load
        setTimeout(() => {
          console.log("🎵 Audio state after load():", {
            readyState: this.audio.readyState,
            duration: this.audio.duration,
            src: this.audio.src,
            error: this.audio.error,
            networkState: this.audio.networkState,
          });
        }, 100);

        // Check if audio starts loading after a longer delay
        setTimeout(() => {
          console.log("🎵 Audio state after 1 second:", {
            readyState: this.audio.readyState,
            duration: this.audio.duration,
            src: this.audio.src,
            error: this.audio.error,
            networkState: this.audio.networkState,
          });
        }, 1000);
      }, 10);

      const onLoadedMetadata = async () => {
        console.log("🎵 Audio metadata loaded event triggered!");
        console.log("🎵 Audio metadata loaded:", {
          readyState: this.audio.readyState,
          duration: this.audio.duration,
          src: this.audio.src,
        });
        cleanup();

        // Load LRC file
        try {
          await this.loadLrcFile(song.lrcFile);
        } catch (lrcError) {
          console.warn("Failed to load LRC file:", lrcError);
        }

        resolve();
      };

      const onError = () => {
        console.log("🎵 Audio error event triggered!");
        const error = this.audio.error;
        const errorMessage = error
          ? `Failed to load audio: ${error.message} (Code: ${error.code})`
          : "Failed to load audio";
        console.error("Audio loading error:", {
          error,
          src: this.audio.src,
          readyState: this.audio.readyState,
        });
        cleanup();
        reject(new Error(errorMessage));
      };

      const cleanup = () => {
        this.audio.removeEventListener("loadedmetadata", onLoadedMetadata);
        this.audio.removeEventListener("error", onError);
      };
    });
  }

  private async loadLrcFile(lrcUrl: string): Promise<void> {
    try {
      const response = await fetch(lrcUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to load LRC file: ${response.status} ${response.statusText}`
        );
      }

      const lrcContent = await response.text();
      this.parsedLrc = parseLrc(lrcContent);

      if (this.onLyricsLoaded) {
        this.onLyricsLoaded(this.parsedLrc);
      }

      console.log("✅ LRC file loaded successfully");
    } catch (error) {
      console.error("❌ Failed to load LRC file:", error);
      throw error;
    }
  }

  async play(): Promise<void> {
    if (!this.audio.src) {
      throw new Error("No audio source loaded");
    }

    try {
      await this.audio.play();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          throw new Error(
            "Browser blocked autoplay. User interaction required."
          );
        }
        throw error;
      }
      throw new Error("Failed to play audio");
    }
  }

  pause(): void {
    this.audio.pause();
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
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

  getState(): SimpleAudioPlayerState {
    return {
      isPlaying: !this.audio.paused,
      currentTime: this.audio.currentTime * 1000,
      duration: this.audio.duration,
      volume: this.audio.volume,
      isMuted: this.audio.muted,
      isReady: this.audio.readyState >= 2 && this.audio.duration > 0,
      error: this.audio.error ? this.audio.error.message : null,
    };
  }

  getCurrentSong(): Song | null {
    return this.currentSong;
  }

  isReadyToPlay(): boolean {
    return (
      this.audio.readyState >= 1 && this.audio.duration > 0 && !this.audio.error
    );
  }

  getAudioState(): {
    readyState: number;
    duration: number;
    error: MediaError | null;
    src: string;
  } {
    return {
      readyState: this.audio.readyState,
      duration: this.audio.duration,
      error: this.audio.error,
      src: this.audio.src,
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

  getUpcomingLyrics(count: number = 2): string[] {
    if (!this.parsedLrc) return [];
    const upcomingLyrics = getUpcomingLyrics(
      this.parsedLrc,
      this.audio.currentTime * 1000,
      count
    );
    return upcomingLyrics.map((lyric) => lyric.text);
  }

  getParsedLrc(): ParsedLrc | null {
    return this.parsedLrc;
  }

  getLyricsForScoring(): Array<{
    word: string;
    startTime: number;
    endTime: number;
  }> {
    if (!this.parsedLrc) return [];

    const words: Array<{ word: string; startTime: number; endTime: number }> =
      [];

    for (let i = 0; i < this.parsedLrc.lines.length; i++) {
      const line = this.parsedLrc.lines[i];
      const nextLine = this.parsedLrc.lines[i + 1];

      if (!line.text.trim()) continue;

      const lineWords = line.text.split(/\s+/).filter((word) => word.trim());
      if (lineWords.length === 0) continue;

      // Calculate duration for this line
      const lineDuration = nextLine
        ? Math.max(1000, nextLine.time - line.time) // At least 1 second
        : 3000; // Default 3 seconds for last line

      // Distribute time evenly across words in the line
      const timePerWord = lineDuration / lineWords.length;

      lineWords.forEach((word, wordIndex) => {
        const startTime = line.time + wordIndex * timePerWord;
        const endTime = startTime + timePerWord;

        words.push({
          word: word.replace(/[^\w\s]/g, ""), // Remove punctuation for matching
          startTime,
          endTime,
        });
      });
    }

    return words;
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

  onErrorCallback(callback: (error: string) => void) {
    this.onError = callback;
  }

  onLyricsLoadedCallback(callback: (parsedLrc: ParsedLrc) => void) {
    this.onLyricsLoaded = callback;
  }

  destroy(): void {
    console.log("🎵 Destroying audio player, current src:", this.audio.src);
    this.audio.pause();
    this.audio.src = "";
    this.onTimeUpdate = null;
    this.onPlay = null;
    this.onPause = null;
    this.onEnded = null;
    this.onError = null;
    this.onLyricsLoaded = null;
    this.currentSong = null;
    this.parsedLrc = null;
    console.log("🎵 Audio player destroyed, src after:", this.audio.src);
  }
}
