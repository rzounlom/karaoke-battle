"use client";

import { calculateKaraokeScore, parseTranscriptToWords } from "@/lib/scoring";
import { useCallback, useEffect, useRef, useState } from "react";

import { SimpleAudioPlayer } from "@/lib/simple-audio-player";
import { Song } from "@/lib/songs-data";
import { useSimpleMicrophone } from "./use-simple-microphone";

interface SimpleKaraokeState {
  isPlaying: boolean;
  isRecording: boolean;
  isPaused: boolean;
  currentTime: number;
  score: number;
  accuracy: number;
  timing: number;
  pitch: number;
  pitchHz: number;
  currentNote: string;
  transcript: string;
  volumeLevel: number;
  microphoneReady: boolean;
  error: string | null;
  isVoiceActive: boolean;
  currentLyric: string | null;
  upcomingLyrics: string[];
  lyricsLoaded: boolean;
  scoringEvents: number; // Track number of scoring events for proper averaging
}

interface UseSimpleKaraokeOptions {
  onScoreUpdate?: (score: number, accuracy: number) => void;
  onGameEnd?: (finalScore: number, totalAccuracy: number) => void;
}

export function useSimpleKaraoke(options: UseSimpleKaraokeOptions = {}) {
  const { onScoreUpdate, onGameEnd } = options;

  const [state, setState] = useState<SimpleKaraokeState>({
    isPlaying: false,
    isRecording: false,
    isPaused: false,
    currentTime: 0,
    score: 0,
    accuracy: 0,
    timing: 0,
    pitch: 0,
    pitchHz: 0,
    currentNote: "",
    transcript: "",
    volumeLevel: 0,
    microphoneReady: false,
    error: null,
    isVoiceActive: false,
    currentLyric: null,
    upcomingLyrics: [],
    lyricsLoaded: false,
    scoringEvents: 0,
  });

  const audioPlayerRef = useRef<SimpleAudioPlayer | null>(null);
  const currentSongRef = useRef<Song | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Microphone hook
  const {
    isRecording: micRecording,
    isPaused: micPaused,
    transcript,
    error: micError,
    microphoneReady,
    isVoiceActive,
    volumeLevel,
    startRecording: startMicRecording,
    pauseRecording: pauseMicRecording,
    resumeRecording: resumeMicRecording,
    stopRecording: stopMicRecording,
    reset: resetMic,
  } = useSimpleMicrophone({
    onTranscript: (transcript, isFinal, confidence) => {
      console.log("🎤 Transcript received:", {
        transcript,
        isFinal,
        confidence,
      });
      if (transcript.trim()) {
        console.log("🎯 Processing transcript for scoring:", {
          isFinal,
          transcript,
        });
        // Get current audio player and song for proper scoring
        const audioPlayer = audioPlayerRef.current;
        const currentSong = currentSongRef.current;

        if (!audioPlayer || !currentSong || !recordingStartTimeRef.current) {
          return;
        }

        // Get current audio time for proper timing
        const currentAudioTime = audioPlayer.getState().currentTime; // Already in milliseconds
        const segmentStartTime = Math.max(0, currentAudioTime - 2000); // 2 seconds ago
        const segmentEndTime = currentAudioTime;

        console.log("🎯 Timing calculation:", {
          currentAudioTime,
          segmentStartTime,
          segmentEndTime,
          transcript,
        });

        // Parse user words with timing
        const userWords = parseTranscriptToWords(
          transcript,
          segmentStartTime,
          segmentEndTime
        );

        // Get expected lyrics from LRC for this time segment
        const allExpectedLyrics = audioPlayer.getLyricsForScoring();
        console.log(
          "🎯 All expected lyrics:",
          allExpectedLyrics.length,
          "lyrics loaded"
        );

        if (allExpectedLyrics.length === 0) {
          console.log("🎯 No LRC lyrics available, using fallback scoring");
          // Fallback to simple scoring if no LRC
          const wordCount = transcript.trim().split(/\s+/).length;
          const baseScore = Math.min(wordCount * 10, 100);
          const confidenceBonus = Math.round(confidence * 50);
          const newScore = baseScore + confidenceBonus;

          setState((prev) => ({
            ...prev,
            score: prev.score + newScore,
            accuracy: Math.round((prev.accuracy + confidence * 100) / 2),
          }));

          if (onScoreUpdate) {
            onScoreUpdate(newScore, confidence * 100);
          }
          return;
        }

        // Get expected lyrics for this time segment
        const expectedLyrics = allExpectedLyrics.filter(
          (lyric) =>
            lyric.startTime >= segmentStartTime &&
            lyric.startTime <= segmentEndTime
        );

        console.log("🎯 Expected lyrics for segment:", {
          segmentStartTime,
          segmentEndTime,
          expectedLyricsCount: expectedLyrics.length,
          expectedLyrics: expectedLyrics.map((l) => ({
            word: l.word,
            startTime: l.startTime,
            endTime: l.endTime,
          })),
        });

        // Calculate proper karaoke score with real pitch data
        const scoringResult = calculateKaraokeScore(
          expectedLyrics,
          transcript,
          userWords,
          state.pitchHz
        );

        setState((prev) => {
          // Calculate proper running average
          const newScoringEvents = prev.scoringEvents + 1;
          const weight = 1 / newScoringEvents; // Weight for this new score
          const prevWeight = prev.scoringEvents / newScoringEvents; // Weight for previous average

          const newState = {
            ...prev,
            score: prev.score + scoringResult.totalScore,
            accuracy: Math.round(
              prev.accuracy * prevWeight + scoringResult.accuracy * weight
            ),
            timing: Math.round(
              prev.timing * prevWeight + scoringResult.timing * weight
            ),
            pitch: Math.round(
              prev.pitch * prevWeight + scoringResult.pitch * weight
            ),
            scoringEvents: newScoringEvents,
          };
          console.log("🔄 State update:", {
            oldAccuracy: prev.accuracy,
            newAccuracy: newState.accuracy,
            oldTiming: prev.timing,
            newTiming: newState.timing,
            oldPitch: prev.pitch,
            newPitch: newState.pitch,
            scoringEvents: newScoringEvents,
            weight,
            prevWeight,
          });
          return newState;
        });

        if (onScoreUpdate) {
          onScoreUpdate(scoringResult.totalScore, scoringResult.accuracy);
        }

        console.log("🎯 Scoring result:", {
          transcript,
          expectedLyrics: expectedLyrics.map((l) => l.word),
          scoringResult,
          currentAccuracy: state.accuracy,
          newAccuracy: scoringResult.accuracy,
        });
      }
    },
    onVoiceActivity: (isActive, level) => {
      setState((prev) => ({
        ...prev,
        isVoiceActive: isActive,
        volumeLevel: level,
      }));
    },
    onPitchDetected: (pitchHz, note) => {
      console.log("🎯 Pitch received in karaoke hook:", { pitchHz, note });
      setState((prev) => ({
        ...prev,
        pitchHz,
        currentNote: note,
      }));
    },
  });

  // Handle game end
  const handleGameEnd = useCallback(() => {
    stopMicRecording();

    if (onGameEnd) {
      onGameEnd(state.score, state.accuracy);
    }

    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isRecording: false,
    }));
  }, [stopMicRecording, onGameEnd, state.score, state.accuracy]);

  // Initialize audio player
  const initializeAudioPlayer = useCallback(
    (song: Song) => {
      console.log("🎵 Initializing audio player for song:", song);
      if (audioPlayerRef.current) {
        console.log("🎵 Destroying existing audio player");
        audioPlayerRef.current.destroy();
      }

      let player;
      try {
        player = new SimpleAudioPlayer();
        audioPlayerRef.current = player;
        currentSongRef.current = song;
        console.log("🎵 New audio player created:", player);
      } catch (error) {
        console.error("🎵 Error creating audio player:", error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create audio player",
        }));
        return null;
      }

      // Set up event handlers
      player.onTimeUpdateCallback((time) => {
        const currentLyric = player.getCurrentLyric();
        const upcomingLyrics = player.getUpcomingLyrics(2);
        setState((prev) => ({
          ...prev,
          currentTime: time,
          currentLyric,
          upcomingLyrics,
        }));
      });

      player.onPlayCallback(() => {
        setState((prev) => ({ ...prev, isPlaying: true }));
      });

      player.onPauseCallback(() => {
        setState((prev) => ({ ...prev, isPlaying: false }));
      });

      player.onEndedCallback(() => {
        handleGameEnd();
      });

      // Remove global error callback - we handle errors in loadSong method
      // player.onErrorCallback((error) => {
      //   setState((prev) => ({ ...prev, error }));
      // });

      player.onLyricsLoadedCallback(() => {
        setState((prev) => ({ ...prev, lyricsLoaded: true }));
        console.log("✅ Lyrics loaded in karaoke hook");
      });

      return player;
    },
    [handleGameEnd]
  );

  // Load song
  const loadSong = useCallback(
    async (song: Song) => {
      try {
        console.log("🎵 Loading song in karaoke hook:", song);

        // Clear any existing error state when starting to load
        console.log("🎵 Clearing error state before loading song");
        setState((prev) => ({ ...prev, error: null }));

        let player = audioPlayerRef.current;
        if (!player || currentSongRef.current?.id !== song.id) {
          player = initializeAudioPlayer(song);
          if (!player) {
            console.error("🎵 Failed to initialize audio player");
            return false;
          }
        }

        await player.loadSong(song);
        return true;
      } catch (error) {
        console.error("Failed to load song:", error);
        console.log(
          "🎵 Setting error state:",
          error instanceof Error ? error.message : "Failed to load song"
        );
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Failed to load song",
        }));
        return false;
      }
    },
    [initializeAudioPlayer]
  );

  // Start gameplay
  const startGame = useCallback(async () => {
    try {
      if (!audioPlayerRef.current) {
        throw new Error("Audio player not initialized");
      }

      // Start audio playback
      await audioPlayerRef.current.play();

      // Start microphone recording
      await startMicRecording();

      recordingStartTimeRef.current = Date.now();

      setState((prev) => ({
        ...prev,
        isRecording: true,
        error: null,
      }));

      console.log("✅ Gameplay started");
    } catch (error) {
      console.error("Failed to start gameplay:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to start gameplay",
      }));
    }
  }, [startMicRecording]);

  // Pause gameplay
  const pauseGame = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    pauseMicRecording();

    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isPaused: true,
    }));

    console.log("⏸️ Gameplay paused");
  }, [pauseMicRecording]);

  // Resume gameplay
  const resumeGame = useCallback(async () => {
    if (audioPlayerRef.current) {
      await audioPlayerRef.current.play();
    }

    resumeMicRecording();

    setState((prev) => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
    }));

    console.log("▶️ Gameplay resumed");
  }, [resumeMicRecording]);

  // Stop gameplay
  const stopGame = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    stopMicRecording();

    recordingStartTimeRef.current = null;

    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isRecording: false,
      isPaused: false,
    }));

    console.log("✅ Gameplay stopped");
  }, [stopMicRecording]);

  // Reset game state
  const resetGame = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
    }

    stopMicRecording();
    resetMic();

    recordingStartTimeRef.current = null;

    setState({
      isPlaying: false,
      isRecording: false,
      isPaused: false,
      currentTime: 0,
      score: 0,
      accuracy: 0,
      timing: 0,
      pitch: 0,
      pitchHz: 0,
      currentNote: "",
      transcript: "",
      volumeLevel: 0,
      microphoneReady: false,
      error: null,
      isVoiceActive: false,
      currentLyric: null,
      upcomingLyrics: [],
      lyricsLoaded: false,
      scoringEvents: 0,
    });
  }, [stopMicRecording, resetMic]);

  // Clear error state
  const clearError = useCallback(() => {
    console.log("🎵 Clearing error state");
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Update state from microphone
  useEffect(() => {
    console.log("🎤 Microphone state update:", {
      micRecording,
      micPaused,
      transcript,
      microphoneReady,
      isVoiceActive,
      volumeLevel,
      micError,
    });
    setState((prev) => ({
      ...prev,
      isRecording: micRecording,
      isPaused: micPaused,
      transcript,
      microphoneReady,
      isVoiceActive,
      volumeLevel,
      // Only set error for critical microphone issues, not normal speech recognition events
      error:
        micError && micError !== "no-speech" && micError !== "aborted"
          ? micError
          : prev.error,
    }));
  }, [
    micRecording,
    micPaused,
    transcript,
    microphoneReady,
    isVoiceActive,
    volumeLevel,
    micError,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.destroy();
      }
    };
  }, []);

  return {
    // State
    ...state,

    // Actions
    loadSong,
    startGame,
    pauseGame,
    resumeGame,
    stopGame,
    resetGame,
    clearError,

    // Audio player methods
    getAudioPlayer: () => audioPlayerRef.current,
    getCurrentSong: () => currentSongRef.current,
  };
}
