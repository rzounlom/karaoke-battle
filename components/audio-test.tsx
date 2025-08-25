"use client";

import { useRef, useState } from "react";

import { Button } from "./ui/button";

export function AudioTest() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<string>("Not loaded");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const testAudio = async () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/audio/hotel-california.mp3");

        audioRef.current.addEventListener("loadstart", () => {
          setLoadingState("Loading started");
          console.log("Test Audio: Load started");
        });

        audioRef.current.addEventListener("loadedmetadata", () => {
          setLoadingState("Metadata loaded");
          console.log(
            "Test Audio: Metadata loaded, duration:",
            audioRef.current?.duration
          );
        });

        audioRef.current.addEventListener("canplay", () => {
          setLoadingState("Can play");
          console.log("Test Audio: Can play");
        });

        audioRef.current.addEventListener("canplaythrough", () => {
          setLoadingState("Can play through");
          console.log("Test Audio: Can play through");
        });

        audioRef.current.addEventListener("error", (e) => {
          const audioError = audioRef.current?.error;
          const errorMsg = audioError
            ? `Error ${audioError.code}: ${audioError.message}`
            : "Unknown error";
          console.error("Test Audio error:", e, audioError);
          setError(errorMsg);
          setLoadingState("Error");
        });

        audioRef.current.addEventListener("play", () => {
          setIsPlaying(true);
        });

        audioRef.current.addEventListener("pause", () => {
          setIsPlaying(false);
        });

        // Start loading
        audioRef.current.load();
      }

      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
    } catch (err) {
      console.error("Play error:", err);
      setError(`Play failed: ${err}`);
    }
  };

  return (
    <div className="bg-white/80 dark:bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-gray-900 dark:text-white font-semibold mb-4">
        Audio Test
      </h3>
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-gray-900 dark:text-white"
          onClick={testAudio}
        >
          {isPlaying ? "⏸️ Pause" : "▶️ Play"} Hotel California
        </Button>
        <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
          Status: {loadingState}
        </div>
        {error && (
          <div className="text-red-600 dark:text-red-400 text-xs mb-2">
            {error}
          </div>
        )}
        <div className="text-xs text-gray-600 dark:text-gray-400">
          This tests direct HTML5 audio playback
          <br />
          URL: /audio/hotel-california.mp3
        </div>
      </div>
    </div>
  );
}
