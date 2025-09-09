"use client";

import { calculateKaraokeScore, parseTranscriptToWords } from "@/lib/scoring";
import { useCallback, useEffect, useRef, useState } from "react";

import { AudioPlayer } from "@/lib/audio-player";
import { Song } from "@/lib/songs-data";
import { useVoiceRecognition } from "./use-voice-recognition";

interface KaraokeGameplayState {
  isPlaying: boolean;
  isRecording: boolean;
  isVoiceActive: boolean;
  currentTime: number;
  score: number;
  accuracy: number;
  timing: number;
  pitch: number;
  transcript: string;
  volumeLevel: number;
  microphoneReady: boolean;
  error: string | null;
  feedback: string;
  showFeedback: boolean;
  currentStreak: number;
  perfectNotes: number;
}

interface UseKaraokeGameplayOptions {
  onScoreUpdate?: (
    score: number,
    accuracy: number,
    timing: number,
    pitch: number
  ) => void;
  onGameEnd?: (finalScore: number, totalAccuracy: number) => void;
  voiceThreshold?: number;
}

export function useKaraokeGameplay(options: UseKaraokeGameplayOptions = {}) {
  const { onScoreUpdate, onGameEnd, voiceThreshold = 0.02 } = options;

  const [state, setState] = useState<KaraokeGameplayState>({
    isPlaying: false,
    isRecording: false,
    isVoiceActive: false,
    currentTime: 0,
    score: 0,
    accuracy: 0,
    timing: 0,
    pitch: 0,
    transcript: "",
    volumeLevel: 0,
    microphoneReady: false,
    error: null,
    feedback: "",
    showFeedback: false,
    currentStreak: 0,
    perfectNotes: 0,
  });

  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const currentSongRef = useRef<Song | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scoreUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio player
  const initializeAudioPlayer = useCallback((song: Song) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.destroy();
    }

    const player = new AudioPlayer();
    audioPlayerRef.current = player;
    currentSongRef.current = song;

    // Set up event handlers
    player.onTimeUpdateCallback((time) => {
      setState((prev) => ({ ...prev, currentTime: time }));
    });

    player.onPlayCallback(() => {
      setState((prev) => ({ ...prev, isPlaying: true }));
    });

    player.onPauseCallback(() => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    });

    player.onEndedCallback(() => {
      // Handle game end will be set up later
    });

    player.onLyricsLoadedCallback((lrc) => {
      // Lyrics loaded
    });

    return player;
  }, []);

  // Load song
  const loadSong = useCallback(
    async (song: Song) => {
      try {
        // Only initialize if we don't have an audio player or if it's a different song
        let player = audioPlayerRef.current;
        if (!player || currentSongRef.current?.id !== song.id) {
          player = initializeAudioPlayer(song);
        }

        await player.loadSong(song);

        return true;
      } catch (error) {
        console.error("Failed to load song:", error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Failed to load song",
        }));
        return false;
      }
    },
    [initializeAudioPlayer]
  );

  // Handle transcript updates for scoring
  const handleTranscriptUpdate = useCallback(
    (transcript: string, confidence: number) => {
      if (!currentSongRef.current || !recordingStartTimeRef.current) return;

      const currentTime = Date.now() - recordingStartTimeRef.current;
      const userWords = parseTranscriptToWords(
        transcript,
        currentTime - 1000,
        currentTime
      );

      // Get expected lyrics from audio player
      const audioPlayer = audioPlayerRef.current;
      if (!audioPlayer) return;

      const expectedLyrics = audioPlayer.getLyricsForScoring();

      // Calculate score
      const scoringResult = calculateKaraokeScore(
        expectedLyrics,
        transcript,
        userWords
      );

      // Update state
      setState((prev) => {
        const newScore = prev.score + scoringResult.totalScore;
        const newStreak =
          scoringResult.totalScore > 80 ? prev.currentStreak + 1 : 0;
        const newPerfectNotes =
          scoringResult.totalScore > 95
            ? prev.perfectNotes + 1
            : prev.perfectNotes;

        return {
          ...prev,
          score: newScore,
          accuracy: scoringResult.accuracy,
          timing: scoringResult.timing,
          pitch: scoringResult.pitch,
          currentStreak: newStreak,
          perfectNotes: newPerfectNotes,
          feedback: scoringResult.feedback[0] || "Keep singing!",
          showFeedback: true,
        };
      });

      // Call score update callback
      if (onScoreUpdate) {
        onScoreUpdate(
          scoringResult.totalScore,
          scoringResult.accuracy,
          scoringResult.timing,
          scoringResult.pitch
        );
      }

      // Show feedback temporarily
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      feedbackTimeoutRef.current = setTimeout(() => {
        setState((prev) => ({ ...prev, showFeedback: false }));
      }, 2000);
    },
    [onScoreUpdate]
  );

  // Memoize the transcript callback to prevent unnecessary re-initializations
  const onTranscriptCallback = useCallback(
    (transcript: string, isFinal: boolean, confidence: number) => {
      if (isFinal && transcript.trim()) {
        handleTranscriptUpdate(transcript, confidence);
      }
    },
    [handleTranscriptUpdate]
  );

  // Memoize the voice activity callback
  const onVoiceActivityCallback = useCallback(
    (isActive: boolean, level: number) => {
      setState((prev) => ({
        ...prev,
        isVoiceActive: isActive,
        volumeLevel: level,
      }));
    },
    []
  );

  // Voice recognition hook
  const {
    isListening,
    isRecording: voiceRecording,
    transcript,
    confidence,
    error: voiceError,
    isVoiceActive,
    volumeLevel,
    microphoneReady,
    startListening,
    stopListening,
    reset: resetVoice,
  } = useVoiceRecognition({
    continuous: false, // Don't start automatically
    interimResults: true,
    lang: "en-US",
    voiceThreshold,
    onTranscript: onTranscriptCallback,
    onVoiceActivity: onVoiceActivityCallback,
  });

  // Start gameplay
  const startGame = useCallback(async () => {
    try {
      if (!audioPlayerRef.current) {
        throw new Error("Audio player not initialized");
      }

      // Start audio playback
      await audioPlayerRef.current.play();

      // Start voice recording
      await startListening();

      recordingStartTimeRef.current = Date.now();

      setState((prev) => ({
        ...prev,
        isRecording: true,
        error: null,
      }));
    } catch (error) {
      console.error("Failed to start gameplay:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to start gameplay",
      }));
    }
  }, [startListening]);

  // Stop gameplay
  const stopGame = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    stopListening();

    recordingStartTimeRef.current = null;

    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isRecording: false,
    }));
  }, [stopListening]);

  // Handle game end
  const handleGameEnd = useCallback(() => {
    stopListening();

    if (onGameEnd) {
      onGameEnd(state.score, state.accuracy);
    }

    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isRecording: false,
    }));
  }, [stopListening, onGameEnd, state.score, state.accuracy]);

  // Reset game state
  const resetGame = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
    }

    stopListening();
    resetVoice();

    recordingStartTimeRef.current = null;

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    if (scoreUpdateIntervalRef.current) {
      clearInterval(scoreUpdateIntervalRef.current);
    }

    setState({
      isPlaying: false,
      isRecording: false,
      isVoiceActive: false,
      currentTime: 0,
      score: 0,
      accuracy: 0,
      timing: 0,
      pitch: 0,
      transcript: "",
      volumeLevel: 0,
      microphoneReady: false,
      error: null,
      feedback: "",
      showFeedback: false,
      currentStreak: 0,
      perfectNotes: 0,
    });
  }, [stopListening, resetVoice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.destroy();
      }
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      if (scoreUpdateIntervalRef.current) {
        clearInterval(scoreUpdateIntervalRef.current);
      }
    };
  }, []);

  return {
    // State
    ...state,
    isListening,
    voiceError,

    // Actions
    loadSong,
    startGame,
    stopGame,
    resetGame,

    // Audio player methods
    getAudioPlayer: () => audioPlayerRef.current,
    getCurrentSong: () => currentSongRef.current,

    // Voice recognition methods
    startListening,
    stopListening,
  };
}
