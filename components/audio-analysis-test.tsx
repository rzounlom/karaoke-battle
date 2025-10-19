"use client";

import { useEffect, useRef, useState } from "react";

import { useAudioAnalysis } from "@/hooks/use-audio-analysis";
import { useSimpleMicrophone } from "@/hooks/use-simple-microphone";

export function AudioAnalysisTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Audio analysis hook
  const {
    isAnalyzing,
    frequencyData,
    timeDomainData,
    dominantFrequency,
    volumeLevel,
    initializeAudioAnalysis,
    startAnalysis,
    stopAnalysis,
  } = useAudioAnalysis({
    onFrequencyUpdate: (data, dominant) => {
      // Only log when we have meaningful data
      if (dominant > 0 || data.some((value) => value > 0)) {
        console.log("Frequency update:", {
          dominant,
          dataLength: data.length,
          maxValue: Math.max(...data),
          nonZeroValues: data.filter((v) => v > 0).length,
        });
      }
    },
    onVolumeUpdate: (level) => {
      if (level > 0.01) {
        console.log("Volume update:", level);
      }
    },
  });

  // Microphone hook with enhanced pitch detection
  const {
    isRecording,
    microphoneReady,
    isVoiceActive,
    pitch,
    note,
    pitchConfidence,
    startRecording,
    stopRecording,
  } = useSimpleMicrophone({
    onPitchDetected: (pitchHz, noteName) => {
      console.log("Pitch detected:", { pitchHz, noteName });
    },
  });

  // Initialize audio analysis
  useEffect(() => {
    const init = async () => {
      try {
        // const { audioContext, analyser } = await initializeAudioAnalysis();
        setIsInitialized(true);
        console.log("Audio analysis initialized");
      } catch (error) {
        console.error("Failed to initialize audio analysis:", error);
      }
    };

    init();
  }, [initializeAudioAnalysis]);

  // Handle window resize for responsive canvas
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        // Trigger a redraw when window resizes
        const canvas = canvasRef.current;
        const containerWidth = canvas.parentElement?.clientWidth || 800;
        canvas.width = containerWidth;
        canvas.height = 200;
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Force continuous redraw when analyzing
  useEffect(() => {
    if (!isAnalyzing) return;

    const animationLoop = () => {
      // Force a re-render by updating a dummy state
      // This ensures the visualization updates continuously
      if (isAnalyzing) {
        setForceUpdate((prev) => prev + 1);
        requestAnimationFrame(animationLoop);
      }
    };

    animationLoop();
  }, [isAnalyzing]);

  // Combined visualization - draw both frequency and waveform
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Only log occasionally to avoid spam
    if (Math.random() < 0.1) {
      // 10% chance to log
      console.log("Drawing visualization...", {
        frequencyDataLength: frequencyData.length,
        timeDomainDataLength: timeDomainData.length,
        dominantFrequency,
        isAnalyzing,
      });
    }

    // Set canvas size to match container
    const containerWidth = canvas.parentElement?.clientWidth || 800;
    const containerHeight = 200;

    canvas.width = containerWidth;
    canvas.height = containerHeight;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas with dark background
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);

    // Draw waveform visualization
    if (timeDomainData.length > 0) {
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const sliceWidth = width / timeDomainData.length;
      let x = 0;

      for (let i = 0; i < timeDomainData.length; i++) {
        const v = timeDomainData[i] / 128.0;
        const y = (v * height) / 2 + height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();
    }

    // Draw text labels
    ctx.fillStyle = "#ffffff";
    ctx.font = "14px Arial";
    ctx.fillText("Real-time Waveform", 10, 20);

    // Draw dominant frequency indicator
    if (dominantFrequency > 0) {
      ctx.fillText(
        `Dominant: ${Math.round(dominantFrequency)}Hz`,
        10,
        height - 10
      );
    } else {
      ctx.fillText("Speak to see visualization", 10, height - 10);
    }
  }, [
    frequencyData,
    timeDomainData,
    dominantFrequency,
    isAnalyzing,
    forceUpdate,
  ]);

  const handleStartTest = async () => {
    if (!microphoneReady) {
      console.log("Microphone not ready");
      return;
    }

    try {
      // Initialize audio analysis first
      const { audioContext, analyser } = await initializeAudioAnalysis();

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create microphone source and connect to analyser
      const microphoneSource = audioContext.createMediaStreamSource(stream);
      microphoneSource.connect(analyser);

      // Start the simple microphone recording for speech recognition
      await startRecording();

      // Start analysis
      startAnalysis();

      // Test if we're getting audio data
      setTimeout(() => {
        console.log("Audio context state:", audioContext.state);
        console.log("Analyser connected:", analyser.numberOfInputs > 0);
        console.log("Sample rate:", audioContext.sampleRate);
      }, 1000);

      console.log(
        "Started audio analysis test with direct microphone connection"
      );
    } catch (error) {
      console.error("Failed to start test:", error);
    }
  };

  const handleStopTest = () => {
    stopRecording();
    stopAnalysis();
    console.log("Stopped audio analysis test");
  };

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="text-xl font-bold mb-4">Audio Analysis Test (Phase 1)</h3>

      <div className="space-y-4">
        {/* Status */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Audio Analysis:</strong>{" "}
            {isAnalyzing ? "✅ Active" : "❌ Inactive"}
          </div>
          <div>
            <strong>Microphone:</strong>{" "}
            {microphoneReady ? "✅ Ready" : "❌ Not Ready"}
          </div>
          <div>
            <strong>Recording:</strong>{" "}
            {isRecording ? "🔴 Recording" : "⏹️ Stopped"}
          </div>
          <div>
            <strong>Voice Active:</strong>{" "}
            {isVoiceActive ? "🎤 Active" : "🔇 Silent"}
          </div>
        </div>

        {/* Real-time Data */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Dominant Frequency:</strong> {Math.round(dominantFrequency)}
            Hz
          </div>
          <div>
            <strong>Volume Level:</strong> {(volumeLevel * 100).toFixed(1)}%
          </div>
          <div>
            <strong>Detected Pitch:</strong> {Math.round(pitch)}Hz ({note})
          </div>
          <div>
            <strong>Pitch Confidence:</strong>{" "}
            {(pitchConfidence * 100).toFixed(1)}%
          </div>
        </div>

        {/* Data Status */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Frequency Data:</strong>{" "}
            {frequencyData.length > 0 ? "✅" : "❌"}
            {frequencyData.length > 0 &&
              ` (${frequencyData.filter((v) => v > 0).length} active)`}
          </div>
          <div>
            <strong>Time Domain Data:</strong>{" "}
            {timeDomainData.length > 0 ? "✅" : "❌"}
            {timeDomainData.length > 0 &&
              ` (${timeDomainData.filter((v) => v > 0).length} active)`}
          </div>
        </div>

        {/* Visualization */}
        <div className="space-y-2">
          <h4 className="font-semibold">Frequency & Waveform Visualization:</h4>
          <div className="w-full overflow-hidden rounded border border-gray-300 dark:border-gray-600">
            <canvas
              ref={canvasRef}
              className="w-full h-48 block"
              style={{ maxWidth: "100%", height: "200px" }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex space-x-4">
          <button
            onClick={handleStartTest}
            disabled={!microphoneReady || isRecording}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Test
          </button>
          <button
            onClick={handleStopTest}
            disabled={!isRecording}
            className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Stop Test
          </button>
        </div>

        {/* Debug Info */}
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <p>
            <strong>Debug Info:</strong>
          </p>
          <p>• Frequency Data Length: {frequencyData.length}</p>
          <p>• Time Domain Data Length: {timeDomainData.length}</p>
          <p>• Initialized: {isInitialized ? "Yes" : "No"}</p>
        </div>
      </div>
    </div>
  );
}
