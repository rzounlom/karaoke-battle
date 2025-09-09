"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Type definitions for Web Speech API and Web Audio API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
    webkitAudioContext: typeof AudioContext;
  }
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
    };
  };
  length: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface VoiceRecognitionState {
  isListening: boolean;
  isRecording: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
  audioBlob: Blob | null;
  audioUrl: string | null;
  isVoiceActive: boolean;
  volumeLevel: number;
  microphoneReady: boolean;
}

interface UseVoiceRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  onTranscript?: (
    transcript: string,
    isFinal: boolean,
    confidence: number
  ) => void;
  onAudioData?: (blob: Blob) => void;
  onVoiceActivity?: (isActive: boolean, volumeLevel: number) => void;
  voiceThreshold?: number;
}

export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}) {
  const {
    continuous = true,
    interimResults = true,
    lang = "en-US",
    onTranscript,
    onAudioData,
    onVoiceActivity,
    voiceThreshold = 0.02,
  } = options;

  const [state, setState] = useState<VoiceRecognitionState>({
    isListening: false,
    isRecording: false,
    transcript: "",
    confidence: 0,
    error: null,
    audioBlob: null,
    audioUrl: null,
    isVoiceActive: false,
    volumeLevel: 0,
    microphoneReady: false,
  });

  const recognitionRef = useRef<any | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef<boolean>(false);

  // Initialize Web Audio API for voice activity detection
  const initializeWebAudio = useCallback(async (stream: MediaStream) => {
    try {
      console.log("🔍 Starting Web Audio initialization...");

      // Check if Web Audio API is available
      if (!window.AudioContext && !window.webkitAudioContext) {
        throw new Error("Web Audio API not supported in this browser");
      }

      console.log("🔍 Creating AudioContext...");
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      console.log("🔍 AudioContext created:", audioContext);
      console.log("🔍 AudioContext state:", audioContext.state);

      // Check if AudioContext is suspended (common in browsers with autoplay policies)
      if (audioContext.state === "suspended") {
        console.log("🔍 AudioContext is suspended, attempting to resume...");
        try {
          await audioContext.resume();
          console.log(
            "🔍 AudioContext resumed successfully, new state:",
            audioContext.state
          );
        } catch (resumeError) {
          console.warn("🔍 Failed to resume AudioContext:", resumeError);
        }
      }

      console.log("🔍 Creating analyser...");
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      console.log("🔍 Analyser created:", analyser);

      console.log("🔍 Creating microphone source...");
      const microphoneSource = audioContext.createMediaStreamSource(stream);
      microphoneSourceRef.current = microphoneSource;
      console.log("🔍 Microphone source created:", microphoneSource);

      // Connect microphone to analyser (but NOT to destination to avoid feedback)
      console.log("🔍 Connecting microphone to analyser...");
      microphoneSource.connect(analyser);
      console.log("🔍 Microphone connected to analyser");

      console.log("✅ Web Audio initialized for voice activity detection");
    } catch (error) {
      console.error("❌ Failed to initialize Web Audio:", error);
      throw error; // Re-throw to let the caller handle it
    }
  }, []);

  // Monitor voice activity
  const startVoiceActivityMonitoring = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) {
      console.warn("🎤 Web Audio not initialized for voice monitoring");
      return;
    }

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);

    const analyzeAudio = () => {
      if (!isRecordingRef.current || !analyserRef.current) {
        return;
      }

      analyser.getFloatTimeDomainData(dataArray);

      // Calculate RMS (root mean square) for volume level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      const volumeLevel = rms;

      // Determine voice activity
      const isVoiceActive = volumeLevel > voiceThreshold;

      // Update state
      setState((prev) => ({
        ...prev,
        isVoiceActive,
        volumeLevel: volumeLevel * 100, // Convert to percentage
      }));

      // Call callback
      if (onVoiceActivity) {
        onVoiceActivity(isVoiceActive, volumeLevel * 100);
      }

      // Continue analysis
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    };

    analyzeAudio();
  }, [voiceThreshold]);

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
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.lang = lang;

        recognition.onstart = () => {
          console.log("🎤 Speech recognition started successfully");
          setState((prev) => ({ ...prev, isListening: true, error: null }));
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = "";
          let interimTranscript = "";
          let maxConfidence = 0;

          for (
            let i = event.resultIndex;
            i < Object.keys(event.results).length;
            i++
          ) {
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
          console.log(
            "🎤 Speech recognition result:",
            fullTranscript,
            "Confidence:",
            maxConfidence
          );

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

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          // Only log non-critical errors to avoid spam
          if (event.error !== "no-speech" && event.error !== "audio-capture") {
            console.error("🎤 Speech recognition error:", event.error);
          } else {
            console.log(
              "🎤 Speech recognition info:",
              event.error,
              "(this is normal)"
            );
          }

          setState((prev) => ({
            ...prev,
            isListening: false,
            error: event.error,
          }));

          // For no-speech errors, automatically restart listening after a short delay
          if (event.error === "no-speech") {
            setTimeout(() => {
              setState((currentState) => {
                // Only restart if we're still recording
                if (
                  recognition &&
                  !recognition.aborted &&
                  currentState.isRecording
                ) {
                  try {
                    console.log(
                      "🎤 Restarting speech recognition after no-speech error"
                    );
                    recognition.start();
                    return {
                      ...currentState,
                      isListening: true,
                      error: null,
                    };
                  } catch (e) {
                    console.log("Could not restart speech recognition:", e);
                  }
                }
                return currentState;
              });
            }, 1500); // Longer delay to avoid rapid restarts
          }
        };

        recognition.onend = () => {
          console.log("🎤 Speech recognition ended");
          setState((prev) => ({ ...prev, isListening: false }));
        };

        console.log("✅ Speech recognition initialized successfully");
      } catch (error) {
        console.error("❌ Failed to initialize speech recognition:", error);
        setState((prev) => ({
          ...prev,
          error: "Failed to initialize speech recognition",
        }));
      }
    } else {
      console.error("❌ Speech recognition not supported in this browser");
      setState((prev) => ({
        ...prev,
        error: "Speech recognition not supported in this browser",
      }));
    }
  }, [continuous, interimResults, lang]);

  // Start voice recognition
  const startListening = useCallback(async () => {
    try {
      console.log("🎤 Starting voice recognition...");

      // Use the already initialized stream
      if (!streamRef.current) {
        throw new Error("Microphone not initialized");
      }

      const stream = streamRef.current;

      // Wait a moment for the stream to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Start speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          console.log("✅ Speech recognition started");
        } catch (recognitionError) {
          console.error("❌ Speech recognition start error:", recognitionError);
          throw new Error("Failed to start speech recognition");
        }
      }

      // Start audio recording
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        const audioUrl = URL.createObjectURL(audioBlob);

        setState((prev) => ({
          ...prev,
          audioBlob,
          audioUrl,
          isRecording: false,
        }));

        if (onAudioData) {
          onAudioData(audioBlob);
        }
      };

      mediaRecorderRef.current.start();
      isRecordingRef.current = true;

      setState((prev) => ({
        ...prev,
        isRecording: true,
        error: null,
      }));

      // Start voice activity monitoring
      startVoiceActivityMonitoring();

      console.log("✅ Voice recognition started successfully");
    } catch (error) {
      console.error("❌ Voice recognition error:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to start recording",
      }));
    }
  }, [startVoiceActivityMonitoring, onAudioData]);

  // Stop voice recognition
  const stopListening = useCallback(() => {
    console.log("🎤 Stopping voice recognition...");

    isRecordingRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log("Speech recognition already stopped");
      }
    }

    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.log("Media recorder already stopped");
      }
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Clean up Web Audio
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    microphoneSourceRef.current = null;
    analyserRef.current = null;

    setState((prev) => ({
      ...prev,
      isRecording: false,
      isListening: false,
      isVoiceActive: false,
      volumeLevel: 0,
    }));

    console.log("✅ Voice recognition stopped");
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setState({
      isListening: false,
      isRecording: false,
      transcript: "",
      confidence: 0,
      error: null,
      audioBlob: null,
      audioUrl: null,
      isVoiceActive: false,
      volumeLevel: 0,
      microphoneReady: false,
    });
  }, []);

  // Initialize microphone on mount
  useEffect(() => {
    console.log("🔍 Microphone useEffect triggered - component mounted");

    const initializeMicrophone = async () => {
      try {
        console.log("🎤 Initializing microphone...");

        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("getUserMedia not supported in this browser");
        }

        // Request microphone permission first
        console.log("🔍 Requesting microphone permission...");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        console.log("🔍 Microphone permission granted, stream:", stream);

        console.log("🎤 Microphone permission granted, stream obtained");
        streamRef.current = stream;

        // Skip Web Audio initialization for now to test basic microphone functionality
        console.log("🔍 Skipping Web Audio initialization for testing");

        setState((prev) => {
          console.log(
            "🔍 Setting microphoneReady to true, previous state:",
            prev
          );
          const newState = {
            ...prev,
            microphoneReady: true,
            error: null,
          };
          console.log("🔍 New state:", newState);
          return newState;
        });

        console.log(
          "✅ Microphone initialized successfully (without Web Audio)"
        );
      } catch (error) {
        console.error("❌ Failed to initialize microphone:", error);

        // Provide more specific error messages
        let errorMessage = "Failed to initialize microphone";
        if (error instanceof Error) {
          if (error.name === "NotAllowedError") {
            errorMessage =
              "Microphone permission denied. Please allow microphone access and refresh the page.";
          } else if (error.name === "NotFoundError") {
            errorMessage =
              "No microphone found. Please connect a microphone and refresh the page.";
          } else if (error.name === "NotReadableError") {
            errorMessage =
              "Microphone is already in use by another application.";
          } else {
            errorMessage = error.message;
          }
        }

        setState((prev) => {
          console.log("🔍 Setting microphone error:", errorMessage);
          return {
            ...prev,
            error: errorMessage,
            microphoneReady: false,
          };
        });
      }
    };

    // Check if we're in a browser environment and add a minimal delay
    console.log("🔍 Checking browser environment:", {
      window: typeof window !== "undefined",
      mediaDevices: !!navigator.mediaDevices,
    });

    if (typeof window !== "undefined" && navigator.mediaDevices) {
      console.log("🔍 Setting up microphone initialization timer");
      const timer = setTimeout(() => {
        console.log("🔍 Timer fired, calling initializeMicrophone");
        initializeMicrophone();
      }, 100); // Reduced delay to ensure faster initialization

      return () => {
        clearTimeout(timer);
        // Don't call stopListening here as it resets the microphone state
        // Just clean up the stream if it exists
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };
    } else {
      console.log(
        "🔍 Browser environment check failed - not initializing microphone"
      );
    }
  }, [initializeWebAudio]);

  return {
    ...state,
    startListening,
    stopListening,
    reset,
  };
}
