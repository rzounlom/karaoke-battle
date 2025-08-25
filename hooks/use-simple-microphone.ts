import { useCallback, useEffect, useRef, useState } from "react";

interface SimpleMicrophoneOptions {
  onVoiceActivity?: (isActive: boolean) => void;
  voiceThreshold?: number;
}

interface SimpleMicrophoneState {
  isRecording: boolean;
  isVoiceActive: boolean;
  volumeLevel: number;
  error: string | null;
  microphoneReady: boolean;
}

export function useSimpleMicrophone(options: SimpleMicrophoneOptions = {}) {
  const {
    onVoiceActivity,
    voiceThreshold = 0.01, // Simple threshold for voice activity
  } = options;

  const [state, setState] = useState<SimpleMicrophoneState>({
    isRecording: false,
    isVoiceActive: false,
    volumeLevel: 0,
    error: null,
    microphoneReady: false,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef<boolean>(false);

  // Initialize microphone
  const initializeMicrophone = useCallback(async () => {
    try {
      console.log("🎤 Initializing simple microphone...");

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Create a separate audio context just for microphone analysis
      // This won't interfere with regular audio playback
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Connect source to analyser but NOT to destination (no feedback)
      source.connect(analyser);

      setState((prev) => ({
        ...prev,
        microphoneReady: true,
        error: null,
      }));

      console.log("✅ Simple microphone initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize microphone:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize microphone",
        microphoneReady: false,
      }));
    }
  }, []);

  // Start monitoring microphone
  const startRecording = useCallback(() => {
    if (!analyserRef.current) {
      console.warn("🎤 Microphone not initialized");
      return;
    }

    isRecordingRef.current = true;
    setState((prev) => ({ ...prev, isRecording: true }));

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let frameCount = 0;
    let previousVoiceActive = false;

    const analyzeAudio = () => {
      if (!isRecordingRef.current || !analyserRef.current) {
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      // Calculate average volume (0-255 range)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const normalizedVolume = average / 255; // Normalize to 0-1

      // Simple voice activity detection
      const isVoiceActive = normalizedVolume > voiceThreshold;

      // Only update state every 10 frames to reduce re-renders
      frameCount++;
      if (frameCount % 10 === 0) {
        setState((prev) => ({
          ...prev,
          volumeLevel: Math.round(normalizedVolume * 100), // 0-100 scale
          isVoiceActive,
        }));

        // Call callback if voice activity changed
        if (onVoiceActivity && previousVoiceActive !== isVoiceActive) {
          onVoiceActivity(isVoiceActive);
        }
        previousVoiceActive = isVoiceActive;
      }

      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    };

    analyzeAudio();
    console.log("🎤 Started simple microphone monitoring");
  }, [voiceThreshold, onVoiceActivity]);

  // Stop monitoring
  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setState((prev) => ({ ...prev, isRecording: false, isVoiceActive: false }));

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    console.log("🎤 Stopped simple microphone monitoring");
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    stopRecording();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    sourceRef.current = null;
    analyserRef.current = null;
    isRecordingRef.current = false;

    setState({
      isRecording: false,
      isVoiceActive: false,
      volumeLevel: 0,
      error: null,
      microphoneReady: false,
    });

    console.log("🎤 Simple microphone cleaned up");
  }, [stopRecording]);

  // Initialize on mount
  useEffect(() => {
    initializeMicrophone();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      isRecordingRef.current = false;
    };
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    initializeMicrophone,
    cleanup,
  };
}
