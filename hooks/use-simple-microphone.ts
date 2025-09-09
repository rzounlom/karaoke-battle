"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SimpleMicrophoneState {
  isRecording: boolean;
  isListening: boolean;
  isPaused: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
  microphoneReady: boolean;
  isVoiceActive: boolean;
  volumeLevel: number;
  pitch: number; // in Hz
  note: string; // musical note (e.g., "A4", "C#5")
}

interface UseSimpleMicrophoneOptions {
  onTranscript?: (
    transcript: string,
    isFinal: boolean,
    confidence: number
  ) => void;
  onVoiceActivity?: (isActive: boolean, volumeLevel: number) => void;
  onPitchDetected?: (pitch: number, note: string) => void;
  voiceThreshold?: number;
}

export function useSimpleMicrophone(options: UseSimpleMicrophoneOptions = {}) {
  const {
    onTranscript,
    onVoiceActivity,
    onPitchDetected,
    voiceThreshold = 0.02,
  } = options;

  const [state, setState] = useState<SimpleMicrophoneState>({
    isRecording: false,
    isListening: false,
    isPaused: false,
    transcript: "",
    confidence: 0,
    error: null,
    microphoneReady: false,
    isVoiceActive: false,
    volumeLevel: 0,
    pitch: 0,
    note: "",
  });

  const recognitionRef = useRef<any | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

  // Pitch detection functions
  const pitchToNote = useCallback((pitch: number): string => {
    if (pitch <= 0) return "";

    // A4 = 440Hz
    const A4 = 440;
    const semitones = 12 * Math.log2(pitch / A4);
    const noteIndex = Math.round(semitones) % 12;
    const octave = Math.floor(Math.log2(pitch / A4) + 4);

    const notes = [
      "A",
      "A#",
      "B",
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
    ];
    const note = notes[noteIndex < 0 ? noteIndex + 12 : noteIndex];

    return `${note}${octave}`;
  }, []);

  const detectPitch = useCallback(
    (
      dataArray: Float32Array,
      sampleRate: number
    ): { pitch: number; note: string } => {
      // Find the dominant frequency using autocorrelation
      const minPeriod = Math.floor(sampleRate / 800); // ~200Hz max
      const maxPeriod = Math.floor(sampleRate / 80); // ~80Hz min

      let bestPeriod = 0;
      let bestCorrelation = 0;

      for (let period = minPeriod; period < maxPeriod; period++) {
        let correlation = 0;
        for (let i = 0; i < dataArray.length - period; i++) {
          correlation += dataArray[i] * dataArray[i + period];
        }

        if (correlation > bestCorrelation) {
          bestCorrelation = correlation;
          bestPeriod = period;
        }
      }

      const pitch = bestPeriod > 0 ? sampleRate / bestPeriod : 0;
      const note = pitchToNote(pitch);

      return { pitch, note };
    },
    [pitchToNote]
  );

  // Initialize microphone
  const initializeMicrophone = useCallback(async () => {
    try {
      console.log("🎤 Initializing microphone...");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia not supported in this browser");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Initialize Web Audio for voice activity detection
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const microphoneSource = audioContext.createMediaStreamSource(stream);
      microphoneSourceRef.current = microphoneSource;
      microphoneSource.connect(analyser);

      setState((prev) => ({
        ...prev,
        microphoneReady: true,
        error: null,
      }));

      console.log("✅ Microphone initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize microphone:", error);
      let errorMessage = "Failed to initialize microphone";
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage =
            "Microphone permission denied. Please allow microphone access.";
        } else if (error.name === "NotFoundError") {
          errorMessage = "No microphone found. Please connect a microphone.";
        } else if (error.name === "NotReadableError") {
          errorMessage = "Microphone is already in use by another application.";
        } else {
          errorMessage = error.message;
        }
      }
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        microphoneReady: false,
      }));
    }
  }, []);

  // Monitor voice activity
  const startVoiceActivityMonitoring = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);

    const analyzeAudio = () => {
      // Check current state instead of stale closure values
      if (!analyserRef.current || !audioContextRef.current) return;

      // Check if we should still be analyzing (current state check)
      if (!isRecordingRef.current || isPausedRef.current) {
        return;
      }

      analyser.getFloatTimeDomainData(dataArray);

      // Calculate RMS for volume level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      const volumeLevel = rms * 100; // Convert to percentage

      // Determine voice activity
      const isVoiceActive = rms > voiceThreshold;

      // Debug voice activity (only log when actually recording and voice is active)
      if (rms > 0.01 && isVoiceActive) {
        console.log("🔊 Voice detected:", {
          rms: Math.round(rms * 100) / 100,
          threshold: voiceThreshold,
        });
      }

      // Detect pitch if voice is active
      let pitch = 0;
      let note = "";
      if (isVoiceActive && audioContextRef.current) {
        const pitchResult = detectPitch(
          dataArray,
          audioContextRef.current.sampleRate
        );
        pitch = pitchResult.pitch;
        note = pitchResult.note;

        // Debug logging (only when pitch is detected)
        if (pitch > 0) {
          console.log("🎵 Pitch detected:", { pitch: Math.round(pitch), note });
        }
      }

      setState((prev) => ({
        ...prev,
        isVoiceActive,
        volumeLevel,
        pitch,
        note,
      }));

      if (onVoiceActivity) {
        onVoiceActivity(isVoiceActive, volumeLevel);
      }

      if (onPitchDetected && isVoiceActive && pitch > 0) {
        onPitchDetected(pitch, note);
      }

      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    };

    analyzeAudio();
  }, [
    state.isRecording,
    state.isPaused,
    voiceThreshold,
    onVoiceActivity,
    onPitchDetected,
    detectPitch,
  ]);

  // Initialize speech recognition
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (window.webkitSpeechRecognition || window.SpeechRecognition)
    ) {
      try {
        const SpeechRecognition =
          window.webkitSpeechRecognition || window.SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();

        const recognition = recognitionRef.current;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          console.log("🎤 Speech recognition started");
          setState((prev) => ({ ...prev, isListening: true, error: null }));
        };

        recognition.onresult = (event: any) => {
          let finalTranscript = "";
          let interimTranscript = "";
          let maxConfidence = 0;

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            const confidence = event.results[i][0].confidence;

            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }

            maxConfidence = Math.max(maxConfidence, confidence);
          }

          const fullTranscript = finalTranscript + interimTranscript;
          setState((prev) => ({
            ...prev,
            transcript: fullTranscript,
            confidence: maxConfidence,
          }));

          if (onTranscript) {
            onTranscript(
              fullTranscript,
              finalTranscript.length > 0,
              maxConfidence
            );
          }
        };

        recognition.onerror = (event: any) => {
          console.error("🎤 Speech recognition error:", event.error);
          setState((prev) => ({
            ...prev,
            isListening: false,
            error: event.error,
          }));
        };

        recognition.onend = () => {
          console.log("🎤 Speech recognition ended");
          setState((prev) => ({ ...prev, isListening: false }));
        };

        console.log("✅ Speech recognition initialized");
      } catch (error) {
        console.error("❌ Failed to initialize speech recognition:", error);
        setState((prev) => ({
          ...prev,
          error: "Failed to initialize speech recognition",
        }));
      }
    } else {
      setState((prev) => ({
        ...prev,
        error: "Speech recognition not supported in this browser",
      }));
    }
  }, []); // Remove onTranscript dependency to prevent re-initialization

  // Initialize microphone on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const timer = setTimeout(initializeMicrophone, 100);
      return () => {
        clearTimeout(timer);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };
    }
  }, [initializeMicrophone]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      if (!streamRef.current) {
        throw new Error("Microphone not initialized");
      }

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      startVoiceActivityMonitoring();

      setState((prev) => ({
        ...prev,
        isRecording: true,
        error: null,
      }));

      isRecordingRef.current = true;
      isPausedRef.current = false;

      console.log("✅ Recording started");
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to start recording",
      }));
    }
  }, [startVoiceActivityMonitoring]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (recognitionRef.current && state.isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        console.log("Speech recognition already stopped");
      }
    }

    setState((prev) => ({
      ...prev,
      isPaused: true,
      isListening: false,
      isVoiceActive: false,
      volumeLevel: 0,
    }));

    isPausedRef.current = true;

    console.log("⏸️ Recording paused");
  }, [state.isListening]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (recognitionRef.current && state.isRecording && state.isPaused) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.log("Failed to resume speech recognition:", error);
      }
    }

    setState((prev) => ({
      ...prev,
      isPaused: false,
    }));

    isPausedRef.current = false;

    console.log("▶️ Recording resumed");
  }, [state.isRecording, state.isPaused]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        console.log("Speech recognition already stopped");
      }
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isRecording: false,
      isListening: false,
      isPaused: false,
      isVoiceActive: false,
      volumeLevel: 0,
    }));

    isRecordingRef.current = false;
    isPausedRef.current = false;

    console.log("✅ Recording stopped");
  }, []);

  // Reset state
  const reset = useCallback(() => {
    stopRecording();
    setState({
      isRecording: false,
      isListening: false,
      isPaused: false,
      transcript: "",
      confidence: 0,
      error: null,
      microphoneReady: false,
      isVoiceActive: false,
      volumeLevel: 0,
      pitch: 0,
      note: "",
    });

    isRecordingRef.current = false;
    isPausedRef.current = false;
  }, [stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
    };
  }, [stopRecording]);

  return {
    ...state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    reset,
  };
}
