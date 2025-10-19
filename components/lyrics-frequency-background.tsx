"use client";

import { useEffect, useRef } from "react";

interface LyricsFrequencyBackgroundProps {
  frequencyData: Uint8Array;
  isActive: boolean;
  className?: string;
}

export function LyricsFrequencyBackground({
  frequencyData,
  isActive,
  className = "",
}: LyricsFrequencyBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive || !frequencyData || frequencyData.length === 0) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match container
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw frequency bars
    const barCount = Math.min(frequencyData.length, 64); // Limit to 64 bars for performance
    const barWidth = rect.width / barCount;
    const maxBarHeight = rect.height * 0.8; // Leave some margin

    for (let i = 0; i < barCount; i++) {
      const barHeight = (frequencyData[i] / 255) * maxBarHeight;
      const x = i * barWidth;
      const y = rect.height - barHeight;

      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(0, y, 0, rect.height);
      gradient.addColorStop(0, `hsl(${280 + i * 2}, 70%, 60%)`); // Purple to pink
      gradient.addColorStop(1, `hsl(${280 + i * 2}, 70%, 30%)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth - 1, barHeight); // -1 for spacing between bars
    }

    // Add subtle glow effect
    ctx.shadowColor = "rgba(147, 51, 234, 0.3)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 0;
  }, [frequencyData, isActive]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ background: "transparent" }}
    />
  );
}
