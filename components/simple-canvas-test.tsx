"use client";

import { useEffect, useRef } from "react";

export function SimpleCanvasTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 200;

    // Draw a simple test pattern
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, 0, 400, 200);

    // Draw a red border
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 400, 200);

    // Draw some test bars
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(10, 150, 20, 30);
    ctx.fillRect(40, 120, 20, 60);
    ctx.fillRect(70, 180, 20, 10);

    // Draw text
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Arial";
    ctx.fillText("Canvas Test", 10, 30);

    console.log("Simple canvas test drawn");
  }, []);

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="text-lg font-bold mb-2">Simple Canvas Test</h3>
      <p className="text-sm mb-4">
        You should see a dark rectangle with green bars and red border below:
      </p>
      <canvas
        ref={canvasRef}
        className="border border-gray-300 dark:border-gray-600 rounded"
        style={{ width: "400px", height: "200px" }}
      />
    </div>
  );
}
