import { useCallback, useEffect, useRef, useState } from "react";

interface WebAudioMicrophoneOptions {
  onVoiceActivity?: (isActive: boolean) => void;
  onAudioData?: (data: Float32Array) => void;
  voiceThreshold?: number;
  smoothingTimeConstant?: number;
}

interface WebAudioMicrophoneState {
  isRecording: boolean;
  isVoiceActive: boolean;
  volumeLevel: number;
  error: string | null;
  microphoneReady: boolean;
}

export function useWebAudioMicrophone(options: WebAudioMicrophoneOptions = {}) {
  const {
    onVoiceActivity,
    onAudioData,
    voiceThreshold = -60, // dB threshold for voice activity (adjusted for RMS)
    smoothingTimeConstant = 0.8,
  } = options;

  const [state, setState] = useState<WebAudioMicrophoneState>({
    isRecording: false,
    isVoiceActive: false,
    volumeLevel: 0,
    error: null,
    microphoneReady: false,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const previousVoiceActiveRef = useRef<boolean>(false);
  const lastUpdateTimeRef = useRef<number>(0);

  // Initialize microphone and Web Audio API
  const initializeMicrophone = useCallback(async () => {
    try {
      console.log("🎤 Initializing Web Audio microphone...");

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Create audio context
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = smoothingTimeConstant;
      analyserRef.current = analyser;

      // Create microphone source
      const microphoneSource = audioContext.createMediaStreamSource(stream);
      microphoneSourceRef.current = microphoneSource;

      // Connect microphone to analyser (but NOT to destination to avoid feedback)
      microphoneSource.connect(analyser);

      setState((prev) => ({
        ...prev,
        microphoneReady: true,
        error: null,
      }));

      console.log("✅ Web Audio microphone initialized successfully");
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
  }, [smoothingTimeConstant]);

  // Start recording/monitoring
  const startRecording = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) {
      console.warn("🎤 Microphone not initialized");
      return;
    }

    isRecordingRef.current = true;
    setState((prev) => ({ ...prev, isRecording: true }));

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);

    const analyzeAudio = () => {
      // Check if we should continue
      if (!isRecordingRef.current || !analyserRef.current) {
        return;
      }

      // Use time domain data instead of frequency data for volume level
      analyser.getFloatTimeDomainData(dataArray);

      // Calculate RMS (root mean square) for volume level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      const average = 20 * Math.log10(rms); // Convert to dB

      // Determine voice activity
      const isVoiceActive = average > voiceThreshold;

      // Call callbacks if voice activity changed
      if (onVoiceActivity && previousVoiceActiveRef.current !== isVoiceActive) {
        onVoiceActivity(isVoiceActive);
      }

      if (onAudioData) {
        onAudioData(dataArray);
      }

      previousVoiceActiveRef.current = isVoiceActive;

      // Throttle state updates to prevent excessive re-renders
      const now = Date.now();
      if (now - lastUpdateTimeRef.current > 100) {
        // Update every 100ms max
        lastUpdateTimeRef.current = now;
        setState((prev) => ({
          ...prev,
          volumeLevel: isFinite(average) ? average : prev.volumeLevel,
          isVoiceActive,
        }));
      }

      // Continue analysis
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    };

    analyzeAudio();
    console.log("🎤 Started Web Audio microphone recording");
  }, [voiceThreshold, onVoiceActivity, onAudioData]);

  // Stop recording/monitoring
  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setState((prev) => ({ ...prev, isRecording: false, isVoiceActive: false }));

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    console.log("🎤 Stopped Web Audio microphone recording");
  }, []);

  // Cleanup function
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

    microphoneSourceRef.current = null;
    analyserRef.current = null;
    isRecordingRef.current = false;
    previousVoiceActiveRef.current = false;
    lastUpdateTimeRef.current = 0;

    setState({
      isRecording: false,
      isVoiceActive: false,
      volumeLevel: 0,
      error: null,
      microphoneReady: false,
    });

    console.log("🎤 Web Audio microphone cleaned up");
  }, [stopRecording]);

  // Initialize on mount - simplified to avoid dependency issues
  useEffect(() => {
    initializeMicrophone();
    return () => {
      // Simple cleanup without dependencies
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      isRecordingRef.current = false;
    };
  }, []); // Empty dependency array

  return {
    ...state,
    startRecording,
    stopRecording,
    initializeMicrophone,
    cleanup,
  };
}
