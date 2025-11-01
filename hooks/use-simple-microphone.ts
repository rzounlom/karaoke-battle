/* eslint-disable @typescript-eslint/no-explicit-any */
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
  pitchConfidence: number; // confidence of pitch detection (0-1)
  timeDomainData: Uint8Array; // for waveform visualization
  frequencyData: Uint8Array; // for frequency spectrum visualization
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
    pitchConfidence: 0,
    timeDomainData: new Uint8Array(0),
    frequencyData: new Uint8Array(0),
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
    ): { pitch: number; note: string; confidence: number } => {
      // Enhanced pitch detection using multiple algorithms
      const minPeriod = Math.floor(sampleRate / 800); // ~800Hz max
      const maxPeriod = Math.floor(sampleRate / 80); // ~80Hz min

      let bestPeriod = 0;
      let bestCorrelation = 0;

      // Apply a simple high-pass filter to remove low-frequency noise
      const filteredData = new Float32Array(dataArray.length);
      for (let i = 1; i < dataArray.length; i++) {
        filteredData[i] = dataArray[i] - 0.95 * dataArray[i - 1];
      }

      // Autocorrelation with improved algorithm
      for (let period = minPeriod; period < maxPeriod; period++) {
        let correlation = 0;
        let normalization = 0;

        for (let i = 0; i < filteredData.length - period; i++) {
          correlation += filteredData[i] * filteredData[i + period];
          normalization += filteredData[i] * filteredData[i];
        }

        // Normalize correlation to avoid bias toward longer periods
        const normalizedCorrelation =
          normalization > 0 ? correlation / normalization : 0;

        if (normalizedCorrelation > bestCorrelation) {
          bestCorrelation = normalizedCorrelation;
          bestPeriod = period;
        }
      }

      // Enhanced confidence calculation
      const confidenceThreshold = 0.15; // Increased threshold for better accuracy
      const pitch =
        bestCorrelation > confidenceThreshold && bestPeriod > 0
          ? sampleRate / bestPeriod
          : 0;

      const note = pitchToNote(pitch);

      // Additional validation for human voice range
      const isValidPitch = pitch >= 80 && pitch <= 800;
      const finalPitch = isValidPitch ? pitch : 0;
      const finalNote = isValidPitch ? note : "";

      // Debug logging (remove in production)
      if (finalPitch > 0) {
        console.log(
          `🎵 Enhanced pitch detected: ${Math.round(
            finalPitch
          )}Hz (${finalNote}), confidence: ${bestCorrelation.toFixed(3)}`
        );
      }

      return {
        pitch: finalPitch,
        note: finalNote,
        confidence: bestCorrelation,
      };
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
      if (!analyserRef.current || !audioContextRef.current) return;
      if (!isRecordingRef.current || isPausedRef.current) return;

      analyser.getFloatTimeDomainData(dataArray);

      // Get frequency data for spectrum visualization
      const frequencyBufferLength = analyser.frequencyBinCount;
      const frequencyDataArray = new Uint8Array(frequencyBufferLength);
      analyser.getByteFrequencyData(frequencyDataArray);

      // Calculate RMS for volume level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      const volumeLevel = rms * 100;

      // Determine voice activity
      const isVoiceActive = rms > voiceThreshold;

      // Detect pitch if voice is active
      let pitch = 0;
      let note = "";
      let confidence = 0;
      if (isVoiceActive && audioContextRef.current) {
        const pitchResult = detectPitch(
          dataArray,
          audioContextRef.current.sampleRate
        );
        pitch = pitchResult.pitch;
        note = pitchResult.note;
        confidence = pitchResult.confidence;
      }

      // Convert Float32Array to Uint8Array for waveform visualization
      const timeDomainUint8 = new Uint8Array(dataArray.length);
      for (let i = 0; i < dataArray.length; i++) {
        timeDomainUint8[i] = Math.max(
          0,
          Math.min(255, (dataArray[i] + 1) * 128)
        );
      }

      // Always update visualization data, but throttle other state updates
      setState((prev) => {
        const hasSignificantChange =
          Math.abs(volumeLevel - prev.volumeLevel) > 2 ||
          isVoiceActive !== prev.isVoiceActive ||
          Math.abs(pitch - prev.pitch) > 10 ||
          note !== prev.note;

        // Always update frequency and time domain data for visualization
        const newState = {
          ...prev,
          timeDomainData: timeDomainUint8,
          frequencyData: frequencyDataArray,
        };

        // Only update other values if they've changed significantly
        if (hasSignificantChange) {
          return {
            ...newState,
            isVoiceActive,
            volumeLevel,
            pitch,
            note,
            pitchConfidence: confidence,
          };
        }

        return newState;
      });

      if (onVoiceActivity) {
        onVoiceActivity(isVoiceActive, volumeLevel);
      }

      if (onPitchDetected && isVoiceActive && pitch > 0) {
        onPitchDetected(pitch, note);
      }

      // Continue the loop only if still recording
      if (isRecordingRef.current && !isPausedRef.current) {
        animationFrameRef.current = requestAnimationFrame(analyzeAudio);
      }
    };

    // Start the analysis loop
    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        recognition.maxAlternatives = 3; // Get multiple recognition alternatives
        recognition.serviceURI = ""; // Use default service

        recognition.onstart = () => {
          console.log("🎤 Speech recognition started");
          setState((prev) => ({ ...prev, isListening: true, error: null }));
        };

        recognition.onresult = (event: any) => {
          let finalTranscript = "";
          let interimTranscript = "";
          let maxConfidence = 0;

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            const confidence = result[0].confidence;

            // Only process results with reasonable confidence
            if (confidence > 0.3) {
              if (result.isFinal) {
                finalTranscript += transcript;
              } else {
                interimTranscript += transcript;
              }

              maxConfidence = Math.max(maxConfidence, confidence);
            }
          }

          // Normalize transcript for better matching
          const normalizeTranscript = (text: string) => {
            return text
              .toLowerCase()
              .replace(/[^\w\s']/g, "") // Remove punctuation except apostrophes
              .replace(/\s+/g, " ") // Normalize whitespace
              .trim();
          };

          const fullTranscript = normalizeTranscript(
            finalTranscript + interimTranscript
          );
          setState((prev) => {
            // Only update if transcript has actually changed to prevent infinite loops
            if (
              prev.transcript !== fullTranscript ||
              Math.abs(prev.confidence - maxConfidence) > 0.1
            ) {
              return {
                ...prev,
                transcript: fullTranscript,
                confidence: maxConfidence,
              };
            }
            return prev; // No change needed
          });

          if (onTranscript) {
            onTranscript(
              fullTranscript,
              finalTranscript.length > 0,
              maxConfidence
            );
          }
        };

        recognition.onerror = (event: any) => {
          console.log("🎤 Speech recognition event:", event.error);

          // Handle different types of errors
          if (event.error === "no-speech") {
            // This is normal - just means no speech was detected
            // Don't treat this as an error that stops the game
            console.log("🎤 No speech detected (normal behavior)");
            setState((prev) => ({
              ...prev,
              isListening: false,
              // Don't set error for no-speech
            }));
          } else if (event.error === "audio-capture") {
            // This is a real error - microphone access issue
            console.error("🎤 Microphone access error:", event.error);
            setState((prev) => ({
              ...prev,
              isListening: false,
              error: "Microphone access denied or unavailable",
            }));
          } else if (event.error === "not-allowed") {
            // User denied microphone permission
            console.error("🎤 Microphone permission denied:", event.error);
            setState((prev) => ({
              ...prev,
              isListening: false,
              error: "Microphone permission denied",
            }));
          } else {
            // Other errors - log but don't necessarily stop the game
            console.warn("🎤 Speech recognition warning:", event.error);
            setState((prev) => ({
              ...prev,
              isListening: false,
              // Only set error for critical issues
              error: event.error === "network" ? "Network error" : null,
            }));
          }
        };

        recognition.onend = () => {
          console.log("🎤 Speech recognition ended");
          setState((prev) => ({ ...prev, isListening: false }));

          // Auto-restart speech recognition if we're still recording
          // This handles cases where speech recognition ends due to no speech
          if (isRecordingRef.current && !isPausedRef.current) {
            console.log("🎤 Auto-restarting speech recognition");
            setTimeout(() => {
              if (
                recognitionRef.current &&
                isRecordingRef.current &&
                !isPausedRef.current
              ) {
                try {
                  recognitionRef.current.start();
                } catch (error) {
                  console.log(
                    "Failed to auto-restart speech recognition:",
                    error
                  );
                  // If restart fails, try again after a longer delay
                  setTimeout(() => {
                    if (
                      recognitionRef.current &&
                      isRecordingRef.current &&
                      !isPausedRef.current
                    ) {
                      try {
                        recognitionRef.current.start();
                        console.log("🎤 Speech recognition restarted on retry");
                      } catch (retryError) {
                        console.log(
                          "Failed to restart speech recognition on retry:",
                          retryError
                        );
                      }
                    }
                  }, 1000);
                }
              }
            }, 100); // Small delay to ensure clean restart
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      console.log("🎤 startRecording called");
      console.log("🎤 streamRef.current:", !!streamRef.current);
      console.log("🎤 analyserRef.current:", !!analyserRef.current);
      console.log("🎤 audioContextRef.current:", !!audioContextRef.current);

      if (!streamRef.current) {
        console.log("❌ No microphone stream, reinitializing...");
        await initializeMicrophone();
        if (!streamRef.current) {
          throw new Error("Microphone not initialized");
        }
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
  }, [startVoiceActivityMonitoring, initializeMicrophone]);

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

    // Restart audio analysis loop for frequency visualization
    startVoiceActivityMonitoring();

    console.log("▶️ Recording resumed");
  }, [state.isRecording, state.isPaused, startVoiceActivityMonitoring]);

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
    setState((prev) => ({
      ...prev,
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
      pitchConfidence: 0,
    }));

    isRecordingRef.current = false;
    isPausedRef.current = false;

    // Reinitialize microphone after reset
    setTimeout(() => {
      initializeMicrophone();
    }, 100);
  }, [stopRecording, initializeMicrophone]);

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

  // Debug logging for microphone state
  console.log("🎤 Microphone hook state:", {
    timeDomainDataLength: state.timeDomainData?.length || 0,
    hasData: state.timeDomainData?.some((v) => v > 0) || false,
    isRecording: state.isRecording,
    isVoiceActive: state.isVoiceActive,
  });

  return {
    ...state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    reset,
  };
}
