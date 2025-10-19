"use client";

import { LyricsFrequencyBackground } from "./lyrics-frequency-background";

interface LyricsDisplayWithFrequencyProps {
  currentLyric: string | null;
  upcomingLyrics: string[];
  frequencyData: Uint8Array;
  isVoiceActive: boolean;
  isRecording: boolean;
  className?: string;
}

export function LyricsDisplayWithFrequency({
  currentLyric,
  upcomingLyrics,
  frequencyData,
  isRecording,
  className = "",
}: LyricsDisplayWithFrequencyProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      {/* Frequency Background */}
      <LyricsFrequencyBackground
        frequencyData={frequencyData}
        isActive={isRecording}
      />

      {/* Lyrics Content */}
      <div className="relative z-10 p-8 text-center min-h-[400px] flex flex-col justify-center">
        {/* Current Lyric */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="text-3xl md:text-4xl font-bold text-white bg-black/20 backdrop-blur-sm px-6 py-4 rounded-lg border border-white/20 shadow-lg">
              {currentLyric || "Get ready to sing!"}
            </div>

            {/* Upcoming Lyrics */}
            {upcomingLyrics.length > 0 && (
              <div className="text-xl md:text-2xl text-white/80 bg-black/10 backdrop-blur-sm px-4 py-3 rounded-lg">
                {upcomingLyrics[0]}
              </div>
            )}

            {upcomingLyrics.length > 1 && (
              <div className="text-lg text-white/60 bg-black/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                {upcomingLyrics[1]}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
