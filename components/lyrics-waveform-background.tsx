"use client";

import { useEffect, useRef } from "react";

interface LyricsWaveformBackgroundProps {
  timeDomainData: Uint8Array;
  isActive: boolean;
  className?: string;
}

export function LyricsWaveformBackground({
  timeDomainData,
  isActive,
  className = "",
}: LyricsWaveformBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Debug logging
    console.log(
      "🎵 WAVEFORM DEBUG - timeDomainDataLength:",
      timeDomainData.length
    );
    console.log("🎵 WAVEFORM DEBUG - isActive:", isActive);
    console.log(
      "🎵 WAVEFORM DEBUG - hasData:",
      timeDomainData.some((v) => v > 0)
    );
    console.log("🎵 WAVEFORM DEBUG - sampleData:", timeDomainData.slice(0, 5));

    // Set canvas size to match container
    const containerWidth = canvas.parentElement?.clientWidth || 400;
    const containerHeight = canvas.parentElement?.clientHeight || 200;

    canvas.width = containerWidth;
    canvas.height = containerHeight;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, width, height);

    // Always draw a test pattern to verify canvas is working
    ctx.fillStyle = "rgba(255, 0, 255, 0.3)";
    ctx.fillRect(10, 10, 50, 20);
    ctx.fillRect(70, 15, 30, 15);

    if (!isActive || !timeDomainData.length) {
      console.log(
        "🎵 WAVEFORM DEBUG - Not drawing: isActive =",
        isActive,
        "dataLength =",
        timeDomainData.length
      );
      return;
    }

    console.log(
      "🎵 WAVEFORM DEBUG - Drawing waveform with",
      timeDomainData.length,
      "data points"
    );

    // Test with some fake data if no real data
    const testData =
      timeDomainData.length === 0
        ? new Uint8Array(1024).map((_, i) => Math.sin(i * 0.1) * 50 + 128)
        : timeDomainData;
    console.log(
      "Using data:",
      testData.length,
      "values, max:",
      Math.max(...testData)
    );

    // Create gradient for waveform
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(147, 51, 234, 0.3)"); // Purple top
    gradient.addColorStop(0.5, "rgba(236, 72, 153, 0.4)"); // Pink middle
    gradient.addColorStop(1, "rgba(147, 51, 234, 0.2)"); // Purple bottom

    // Draw waveform
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.beginPath();

    const sliceWidth = width / testData.length;
    let x = 0;

    for (let i = 0; i < testData.length; i++) {
      const v = testData[i] / 128.0;
      const y = (v * height) / 2 + height / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();

    // Add subtle glow effect
    ctx.shadowColor = "rgba(147, 51, 234, 0.5)";
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    console.log("Waveform drawn successfully");
  }, [timeDomainData, isActive]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ zIndex: 1 }}
    />
  );
}
