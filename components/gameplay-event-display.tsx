"use client";

import { useEffect, useState } from "react";
import { GameplayEvent } from "@/hooks/use-gameplay-events";

interface GameplayEventDisplayProps {
  events: GameplayEvent[];
  className?: string;
}

export function GameplayEventDisplay({
  events,
  className = "",
}: GameplayEventDisplayProps) {
  const [visibleEvents, setVisibleEvents] = useState<GameplayEvent[]>([]);

  useEffect(() => {
    // Show events as they come in
    setVisibleEvents(events);
  }, [events]);

  if (visibleEvents.length === 0) return null;

  return (
    <div
      className={`fixed top-20 right-4 z-40 space-y-2 max-w-sm ${className}`}
    >
      {visibleEvents.map((event) => (
        <GameplayEventItem key={event.id} event={event} />
      ))}
    </div>
  );
}

interface GameplayEventItemProps {
  event: GameplayEvent;
}

function GameplayEventItem({ event }: GameplayEventItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Trigger exit animation before removal
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, event.duration - 500);

    return () => clearTimeout(timer);
  }, [event.duration]);

  const getEventStyles = () => {
    const baseStyles =
      "px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm border transition-all duration-500 transform";

    switch (event.type) {
      case "streak":
        return `${baseStyles} bg-gradient-to-r from-orange-500/90 to-red-500/90 border-orange-300 text-white`;
      case "accuracy_boost":
        return `${baseStyles} bg-gradient-to-r from-green-500/90 to-emerald-500/90 border-green-300 text-white`;
      case "timing_boost":
        return `${baseStyles} bg-gradient-to-r from-blue-500/90 to-cyan-500/90 border-blue-300 text-white`;
      case "perfect_note":
        return `${baseStyles} bg-gradient-to-r from-yellow-400/90 to-pink-500/90 border-yellow-300 text-white`;
      case "combo_break":
        return `${baseStyles} bg-gradient-to-r from-gray-600/90 to-gray-700/90 border-gray-400 text-white`;
      case "level_up":
        return `${baseStyles} bg-gradient-to-r from-purple-500/90 to-pink-500/90 border-purple-300 text-white`;
      default:
        return `${baseStyles} bg-white/90 dark:bg-gray-800/90 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white`;
    }
  };

  const getAnimationStyles = () => {
    if (isExiting) {
      return "translate-x-full opacity-0 scale-95";
    }
    if (isVisible) {
      return "translate-x-0 opacity-100 scale-100";
    }
    return "translate-x-full opacity-0 scale-95";
  };

  return (
    <div
      className={`${getEventStyles()} ${getAnimationStyles()} max-w-sm`}
      style={{
        animation:
          event.type === "perfect_note" ? "pulse 0.5s ease-in-out" : undefined,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-xs font-semibold leading-tight">
            {event.message}
          </div>
          {event.points > 0 && (
            <div className="text-xs opacity-90 mt-1">
              +{event.points} bonus points
            </div>
          )}
        </div>
        <div className="ml-2 flex-shrink-0">
          {event.type === "streak" && <span className="text-sm">🔥</span>}
          {event.type === "accuracy_boost" && (
            <span className="text-sm">🎤</span>
          )}
          {event.type === "timing_boost" && <span className="text-sm">⏰</span>}
          {event.type === "perfect_note" && <span className="text-sm">🌟</span>}
          {event.type === "combo_break" && <span className="text-sm">💔</span>}
          {event.type === "level_up" && <span className="text-sm">🎉</span>}
        </div>
      </div>
    </div>
  );
}

// Full-screen event display component
interface FullScreenEventDisplayProps {
  events: GameplayEvent[];
  className?: string;
}

export function FullScreenEventDisplay({
  events,
  className = "",
}: FullScreenEventDisplayProps) {
  const [visibleEvents, setVisibleEvents] = useState<GameplayEvent[]>([]);

  useEffect(() => {
    setVisibleEvents(events);
  }, [events]);

  if (visibleEvents.length === 0) return null;

  return (
    <div
      className={`fixed top-24 right-4 z-40 space-y-3 max-w-sm ${className}`}
    >
      {visibleEvents.map((event) => (
        <FullScreenEventItem key={event.id} event={event} />
      ))}
    </div>
  );
}

function FullScreenEventItem({ event }: GameplayEventItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, event.duration - 500);

    return () => clearTimeout(timer);
  }, [event.duration]);

  const getEventStyles = () => {
    const baseStyles =
      "px-4 py-3 rounded-xl shadow-2xl backdrop-blur-sm border transition-all duration-500 transform text-center";

    switch (event.type) {
      case "streak":
        return `${baseStyles} bg-gradient-to-r from-orange-500/95 to-red-500/95 border-orange-300 text-white`;
      case "accuracy_boost":
        return `${baseStyles} bg-gradient-to-r from-green-500/95 to-emerald-500/95 border-green-300 text-white`;
      case "timing_boost":
        return `${baseStyles} bg-gradient-to-r from-blue-500/95 to-cyan-500/95 border-blue-300 text-white`;
      case "perfect_note":
        return `${baseStyles} bg-gradient-to-r from-yellow-400/95 to-pink-500/95 border-yellow-300 text-white`;
      case "combo_break":
        return `${baseStyles} bg-gradient-to-r from-gray-600/95 to-gray-700/95 border-gray-400 text-white`;
      case "level_up":
        return `${baseStyles} bg-gradient-to-r from-purple-500/95 to-pink-500/95 border-purple-300 text-white`;
      default:
        return `${baseStyles} bg-white/95 dark:bg-gray-800/95 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white`;
    }
  };

  const getAnimationStyles = () => {
    if (isExiting) {
      return "translate-y-[-100%] opacity-0 scale-90";
    }
    if (isVisible) {
      return "translate-y-0 opacity-100 scale-100";
    }
    return "translate-y-[-100%] opacity-0 scale-90";
  };

  return (
    <div
      className={`${getEventStyles()} ${getAnimationStyles()} min-w-[300px]`}
      style={{
        animation:
          event.type === "perfect_note" ? "bounce 0.6s ease-in-out" : undefined,
      }}
    >
      <div className="flex flex-col items-center">
        <div className="text-lg mb-1">
          {event.type === "streak" && "🔥"}
          {event.type === "accuracy_boost" && "🎤"}
          {event.type === "timing_boost" && "⏰"}
          {event.type === "perfect_note" && "🌟"}
          {event.type === "combo_break" && "💔"}
          {event.type === "level_up" && "🎉"}
        </div>
        <div className="text-sm font-bold leading-tight mb-1">
          {event.message}
        </div>
        {event.points > 0 && (
          <div className="text-xs opacity-90">+{event.points} bonus points</div>
        )}
      </div>
    </div>
  );
}
