"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface AudioAnalysisState {
  isAnalyzing: boolean;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  floatFrequencyData: Float32Array;
  floatTimeDomainData: Float32Array;
  dominantFrequency: number;
  volumeLevel: number;
  error: string | null;
}

interface UseAudioAnalysisOptions {
  fftSize?: number;
  smoothingTimeConstant?: number;
  minDecibels?: number;
  maxDecibels?: number;
  onFrequencyUpdate?: (
    frequencyData: Uint8Array,
    dominantFrequency: number
  ) => void;
  onTimeDomainUpdate?: (timeDomainData: Uint8Array) => void;
  onVolumeUpdate?: (volumeLevel: number) => void;
}

export function useAudioAnalysis(options: UseAudioAnalysisOptions = {}) {
  const {
    fftSize = 2048,
    smoothingTimeConstant = 0.8,
    minDecibels = -90,
    maxDecibels = -10,
    onFrequencyUpdate,
    onTimeDomainUpdate,
    onVolumeUpdate,
  } = options;

  const [state, setState] = useState<AudioAnalysisState>({
    isAnalyzing: false,
    frequencyData: new Uint8Array(0),
    timeDomainData: new Uint8Array(0),
    floatFrequencyData: new Float32Array(0),
    floatTimeDomainData: new Float32Array(0),
    dominantFrequency: 0,
    volumeLevel: 0,
    error: null,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isAnalyzingRef = useRef<boolean>(false);

  // Initialize audio context and analyser
  const initializeAudioAnalysis = useCallback(async () => {
    try {
      console.log("🎵 Initializing audio analysis...");

      // Create audio context
      const audioContext = new (window.AudioContext ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothingTimeConstant;
      analyser.minDecibels = minDecibels;
      analyser.maxDecibels = maxDecibels;
      analyserRef.current = analyser;

      setState((prev) => ({
        ...prev,
        error: null,
      }));

      console.log("✅ Audio analysis initialized successfully");
      return { audioContext, analyser };
    } catch (error) {
      console.error("❌ Failed to initialize audio analysis:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize audio analysis",
      }));
      throw error;
    }
  }, [fftSize, smoothingTimeConstant, minDecibels, maxDecibels]);

  // Connect audio source to analyser
  const connectAudioSource = useCallback((audioSource: AudioNode) => {
    if (!analyserRef.current) {
      throw new Error("Analyser not initialized");
    }

    // Disconnect any existing connections
    analyserRef.current.disconnect();

    // Connect the audio source to the analyser
    audioSource.connect(analyserRef.current);

    console.log("✅ Audio source connected to analyser");
  }, []);

  // Start real-time audio analysis
  const startAnalysis = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) {
      console.warn("🎵 Audio analysis not initialized");
      return;
    }

    isAnalyzingRef.current = true;
    setState((prev) => ({ ...prev, isAnalyzing: true }));

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;

    // Create data arrays
    const frequencyData = new Uint8Array(bufferLength);
    const timeDomainData = new Uint8Array(bufferLength);
    const floatFrequencyData = new Float32Array(bufferLength);
    const floatTimeDomainData = new Float32Array(bufferLength);

    const analyzeAudio = () => {
      if (!isAnalyzingRef.current || !analyserRef.current) {
        return;
      }

      // Get frequency domain data
      analyser.getByteFrequencyData(frequencyData);
      analyser.getFloatFrequencyData(floatFrequencyData);

      // Get time domain data
      analyser.getByteTimeDomainData(timeDomainData);
      analyser.getFloatTimeDomainData(floatTimeDomainData);

      // Calculate dominant frequency
      const dominantFrequency = calculateDominantFrequency(
        floatFrequencyData,
        audioContextRef.current!.sampleRate
      );

      // Calculate volume level from time domain data
      const volumeLevel = calculateVolumeLevel(floatTimeDomainData);

      // Update state with new data arrays (create new references to trigger re-renders)
      setState((prev) => ({
        ...prev,
        frequencyData: new Uint8Array(frequencyData),
        timeDomainData: new Uint8Array(timeDomainData),
        floatFrequencyData: new Float32Array(floatFrequencyData),
        floatTimeDomainData: new Float32Array(floatTimeDomainData),
        dominantFrequency,
        volumeLevel,
      }));

      // Call callbacks
      if (onFrequencyUpdate) {
        onFrequencyUpdate(frequencyData, dominantFrequency);
      }
      if (onTimeDomainUpdate) {
        onTimeDomainUpdate(timeDomainData);
      }
      if (onVolumeUpdate) {
        onVolumeUpdate(volumeLevel);
      }

      // Continue analysis
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    };

    analyzeAudio();
    console.log("🎵 Started audio analysis");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFrequencyUpdate, onTimeDomainUpdate, onVolumeUpdate]);

  // Stop audio analysis
  const stopAnalysis = useCallback(() => {
    isAnalyzingRef.current = false;
    setState((prev) => ({ ...prev, isAnalyzing: false }));

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    console.log("🎵 Stopped audio analysis");
  }, []);

  // Calculate dominant frequency from frequency data
  const calculateDominantFrequency = useCallback(
    (frequencyData: Float32Array, sampleRate: number): number => {
      let maxValue = 0;
      let maxIndex = 0;

      // Find the frequency bin with the highest amplitude
      for (let i = 0; i < frequencyData.length; i++) {
        if (frequencyData[i] > maxValue) {
          maxValue = frequencyData[i];
          maxIndex = i;
        }
      }

      // Convert bin index to frequency
      const frequency = (maxIndex * sampleRate) / (frequencyData.length * 2);

      // Only return frequency if it's above a threshold (to filter out noise)
      return maxValue > 0.01 ? frequency : 0;
    },
    []
  );

  // Calculate volume level from time domain data
  const calculateVolumeLevel = useCallback(
    (timeDomainData: Float32Array): number => {
      let sum = 0;
      for (let i = 0; i < timeDomainData.length; i++) {
        sum += timeDomainData[i] * timeDomainData[i];
      }
      const rms = Math.sqrt(sum / timeDomainData.length);
      return Math.min(1, rms * 10); // Scale to 0-1 range
    },
    []
  );

  // Get frequency data for a specific frequency range
  const getFrequencyRange = useCallback(
    (minFreq: number, maxFreq: number): number => {
      if (!analyserRef.current || !audioContextRef.current) {
        return 0;
      }

      const sampleRate = audioContextRef.current.sampleRate;
      const nyquist = sampleRate / 2;
      const binSize = nyquist / (analyserRef.current.frequencyBinCount / 2);

      const minBin = Math.floor(minFreq / binSize);
      const maxBin = Math.floor(maxFreq / binSize);

      let sum = 0;
      for (
        let i = minBin;
        i <= maxBin && i < state.floatFrequencyData.length;
        i++
      ) {
        sum += state.floatFrequencyData[i];
      }

      return sum / (maxBin - minBin + 1);
    },
    [state.floatFrequencyData]
  );

  // Get pitch from frequency data using autocorrelation
  const getPitchFromFrequency = useCallback((): {
    pitch: number;
    confidence: number;
  } => {
    if (!state.floatTimeDomainData.length || !audioContextRef.current) {
      return { pitch: 0, confidence: 0 };
    }

    const sampleRate = audioContextRef.current.sampleRate;
    const data = state.floatTimeDomainData;

    // Autocorrelation-based pitch detection
    const minPeriod = Math.floor(sampleRate / 800); // ~800Hz max
    const maxPeriod = Math.floor(sampleRate / 80); // ~80Hz min

    let bestPeriod = 0;
    let bestCorrelation = 0;

    for (let period = minPeriod; period < maxPeriod; period++) {
      let correlation = 0;
      let normalization = 0;

      for (let i = 0; i < data.length - period; i++) {
        correlation += data[i] * data[i + period];
        normalization += data[i] * data[i];
      }

      const normalizedCorrelation =
        normalization > 0 ? correlation / normalization : 0;

      if (normalizedCorrelation > bestCorrelation) {
        bestCorrelation = normalizedCorrelation;
        bestPeriod = period;
      }
    }

    const pitch =
      bestCorrelation > 0.1 && bestPeriod > 0 ? sampleRate / bestPeriod : 0;
    return { pitch, confidence: bestCorrelation };
  }, [state.floatTimeDomainData]);

  // Cleanup
  const cleanup = useCallback(() => {
    stopAnalysis();

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    isAnalyzingRef.current = false;

    setState({
      isAnalyzing: false,
      frequencyData: new Uint8Array(0),
      timeDomainData: new Uint8Array(0),
      floatFrequencyData: new Float32Array(0),
      floatTimeDomainData: new Float32Array(0),
      dominantFrequency: 0,
      volumeLevel: 0,
      error: null,
    });

    console.log("🎵 Audio analysis cleaned up");
  }, [stopAnalysis]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    ...state,
    initializeAudioAnalysis,
    connectAudioSource,
    startAnalysis,
    stopAnalysis,
    getFrequencyRange,
    getPitchFromFrequency,
    cleanup,
  };
}
