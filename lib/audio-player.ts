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
    console.log(`🎵 AudioPlayer [${this.instanceId}] constructor starting...`);
    this.audio = new Audio();
    console.log(
      `🎵 [${this.instanceId}] Audio element created, initial src:`,
      this.audio.src
    );
    this.audio.preload = "auto";
    this.audio.volume = 0.8; // Set default volume
    this.audio.crossOrigin = "anonymous"; // In case of CORS issues
    console.log(
      `🎵 [${this.instanceId}] Audio element configured, src after config:`,
      this.audio.src
    );
    this.setupEventListeners();

    console.log(`🎵 [${this.instanceId}] Constructor completed`, {
      volume: this.audio.volume,
      preload: this.audio.preload,
      initialSrc: this.audio.src,
      currentLocation: window.location.href,
    });
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
      const audioError = this.audio.error;
      const errorDetails = {
        event: e,
        src: this.audio.src,
        networkState: this.audio.networkState,
        readyState: this.audio.readyState,
        audioError: audioError
          ? {
              code: audioError.code,
              message: audioError.message,
              MEDIA_ERR_ABORTED: audioError.MEDIA_ERR_ABORTED,
              MEDIA_ERR_NETWORK: audioError.MEDIA_ERR_NETWORK,
              MEDIA_ERR_DECODE: audioError.MEDIA_ERR_DECODE,
              MEDIA_ERR_SRC_NOT_SUPPORTED:
                audioError.MEDIA_ERR_SRC_NOT_SUPPORTED,
            }
          : null,
        errorType: audioError ? this.getErrorType(audioError.code) : "Unknown",
      };

      console.error(
        `AudioPlayer [${this.instanceId}]: Audio playback error`,
        errorDetails
      );

      // Try to provide helpful error messages
      if (audioError) {
        switch (audioError.code) {
          case 1: // MEDIA_ERR_ABORTED
            console.warn("Audio loading was aborted by user or browser");
            break;
          case 2: // MEDIA_ERR_NETWORK
            console.warn(
              "Network error while loading audio - check if file is accessible"
            );
            break;
          case 3: // MEDIA_ERR_DECODE
            console.warn("Audio file is corrupted or format not supported");
            break;
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            console.warn("Audio format or MIME type not supported by browser");
            break;
        }
      }
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
      console.log("AudioPlayer: Can play through");
    });

    this.audio.addEventListener("stalled", () => {
      console.warn("AudioPlayer: Loading stalled");
    });

    this.audio.addEventListener("waiting", () => {
      console.log("AudioPlayer: Waiting for data");
    });
  }

  async loadSong(song: Song): Promise<void> {
    console.log(`🎵 [${this.instanceId}] Loading song:`, song);

    if (!song) {
      throw new Error("No song provided to loadSong");
    }

    if (!song.audioFile) {
      throw new Error(`Song "${song.title}" has no audioFile specified`);
    }

    console.log(
      `🎵 [${this.instanceId}] Song audio file path:`,
      song.audioFile
    );
    this.currentSong = song;

    // Load audio file first
    try {
      console.log(
        `🎵 [${this.instanceId}] About to call loadAudio with:`,
        song.audioFile
      );
      await this.loadAudio(song.audioFile);
      console.log(`🎵 [${this.instanceId}] Audio loaded successfully`);
    } catch (audioError) {
      console.error("AudioPlayer: Failed to load audio file", audioError);
      throw new Error(
        `Cannot load audio file: ${
          audioError instanceof Error ? audioError.message : audioError
        }`
      );
    }

    // Load and parse LRC file
    try {
      console.log("AudioPlayer: Loading LRC file from", song.lrcFile);
      const lrcResponse = await fetch(song.lrcFile);
      if (!lrcResponse.ok) {
        throw new Error(
          `Failed to load LRC file: ${lrcResponse.status} ${lrcResponse.statusText}`
        );
      }

      const lrcContent = await lrcResponse.text();
      this.parsedLrc = parseLrc(lrcContent);
      console.log(
        "AudioPlayer: LRC parsed successfully, lines:",
        this.parsedLrc.lines.length
      );

      if (this.onLyricsLoaded) {
        this.onLyricsLoaded(this.parsedLrc);
      }
    } catch (error) {
      console.error("AudioPlayer: Failed to load LRC file:", error);
      this.parsedLrc = null;
      // Don't throw here - lyrics are optional, audio is required
    }
  }

  private loadAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`🎵 [${this.instanceId}] Loading audio from:`, audioUrl);
      console.log(`🎵 [${this.instanceId}] audioUrl type:`, typeof audioUrl);
      console.log(`🎵 [${this.instanceId}] audioUrl length:`, audioUrl?.length);
      console.log(
        `🎵 [${this.instanceId}] Current window location:`,
        window.location.href
      );

      if (!audioUrl || audioUrl.trim() === "") {
        const error = new Error("Invalid audio URL provided");
        console.error("AudioPlayer: Invalid URL", { audioUrl });
        reject(error);
        return;
      }

      console.log(
        `🎵 [${this.instanceId}] About to set audio.src to:`,
        audioUrl
      );
      // Set new source directly (don't clear first as it causes issues)
      this.audio.src = audioUrl;
      console.log(
        `🎵 [${this.instanceId}] Audio source actually set to:`,
        this.audio.src
      );
      console.log(
        `🎵 [${this.instanceId}] Audio src matches input?`,
        this.audio.src === audioUrl
      );

      // Set up one-time event listeners for this load operation
      const onCanPlayThrough = () => {
        console.log("AudioPlayer: Audio can play through - load complete", {
          src: this.audio.src,
          duration: this.audio.duration,
          readyState: this.audio.readyState,
        });
        cleanup();
        resolve();
      };

      const onError = (e: Event) => {
        const errorMsg = `Failed to load audio from ${audioUrl}. Check if file exists and is accessible.`;
        console.error("AudioPlayer: Failed to load audio in loadAudio method", {
          url: audioUrl,
          currentSrc: this.audio.src,
          error: e,
          audioError: this.audio.error,
          networkState: this.audio.networkState,
          readyState: this.audio.readyState,
          message: errorMsg,
        });
        cleanup();
        reject(new Error(errorMsg));
      };

      const onLoadStart = () => {
        console.log("AudioPlayer: Load started for", this.audio.src);
      };

      const cleanup = () => {
        this.audio.removeEventListener("canplaythrough", onCanPlayThrough);
        this.audio.removeEventListener("error", onError);
        this.audio.removeEventListener("loadstart", onLoadStart);
      };

      this.audio.addEventListener("canplaythrough", onCanPlayThrough, {
        once: true,
      });
      this.audio.addEventListener("error", onError, { once: true });
      this.audio.addEventListener("loadstart", onLoadStart, { once: true });

      // Start loading
      this.audio.load();
      console.log("AudioPlayer: Called audio.load() for", this.audio.src);
    });
  }

  play(): Promise<void> {
    console.log("AudioPlayer: Attempting to play audio", {
      src: this.audio.src,
      readyState: this.audio.readyState,
      paused: this.audio.paused,
      networkState: this.audio.networkState,
      duration: this.audio.duration,
      currentTime: this.audio.currentTime,
      volume: this.audio.volume,
      muted: this.audio.muted,
    });

    if (!this.audio.src) {
      const error = new Error("No audio source loaded");
      console.error("AudioPlayer: Cannot play - no source", error);
      return Promise.reject(error);
    }

    // Check if audio is in an error state
    if (this.audio.error) {
      const error = new Error(
        `Audio is in error state: ${this.audio.error.message}`
      );
      console.error("AudioPlayer: Cannot play - audio has error", {
        audioError: this.audio.error,
        errorCode: this.audio.error.code,
      });
      return Promise.reject(error);
    }

    // For readyState 0 (HAVE_NOTHING), wait a bit and try again
    if (this.audio.readyState === 0) {
      console.log("AudioPlayer: Audio not ready, waiting for load...");
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
      console.error("AudioPlayer: Play failed", {
        error: error,
        name: error.name,
        message: error.message,
        src: this.audio.src,
        readyState: this.audio.readyState,
        networkState: this.audio.networkState,
      });

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
      duration: this.audio.duration * 1000, // Convert to milliseconds
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
    console.log("AudioPlayer: isReadyToPlay check", {
      src: this.audio.src,
      srcValid:
        this.audio.src !== "" && this.audio.src !== window.location.href,
      readyState: this.audio.readyState,
      readyStateOk: this.audio.readyState >= 2,
      hasError: !!this.audio.error,
      duration: this.audio.duration,
      durationValid: this.audio.duration > 0 && !isNaN(this.audio.duration),
      overallReady: ready,
    });
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
    console.log(`🗑️ [${this.instanceId}] Destroying AudioPlayer instance`);
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
