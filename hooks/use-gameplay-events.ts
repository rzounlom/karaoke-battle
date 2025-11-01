"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface GameplayEvent {
  id: string;
  type:
    | "streak"
    | "accuracy_boost"
    | "timing_boost"
    | "perfect_note"
    | "combo_break"
    | "level_up";
  message: string;
  points: number;
  timestamp: number;
  duration: number;
}

export interface GameplayStats {
  currentStreak: number;
  maxStreak: number;
  perfectNotes: number;
  accuracyBoosts: number;
  timingBoosts: number;
  totalBonusPoints: number;
  lastEventTime: number;
}

interface UseGameplayEventsOptions {
  onEvent?: (event: GameplayEvent) => void;
  onStatsUpdate?: (stats: GameplayStats) => void;
}

export function useGameplayEvents(options: UseGameplayEventsOptions = {}) {
  const { onEvent, onStatsUpdate } = options;

  const [events, setEvents] = useState<GameplayEvent[]>([]);
  const [stats, setStats] = useState<GameplayStats>({
    currentStreak: 0,
    maxStreak: 0,
    perfectNotes: 0,
    accuracyBoosts: 0,
    timingBoosts: 0,
    totalBonusPoints: 0,
    lastEventTime: 0,
  });

  const eventTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Generate unique event ID
  const generateEventId = useCallback(() => {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add event with auto-removal
  const addEvent = useCallback(
    (event: Omit<GameplayEvent, "id" | "timestamp">) => {
      const newEvent: GameplayEvent = {
        ...event,
        id: generateEventId(),
        timestamp: Date.now(),
      };

      setEvents((prev) => [...prev, newEvent]);

      // Auto-remove event after duration
      const timeout = setTimeout(() => {
        setEvents((prev) => prev.filter((e) => e.id !== newEvent.id));
        eventTimeoutRefs.current.delete(newEvent.id);
      }, newEvent.duration);

      eventTimeoutRefs.current.set(newEvent.id, timeout);

      // Call event callback
      if (onEvent) {
        onEvent(newEvent);
      }

      return newEvent;
    },
    [generateEventId, onEvent]
  );

  // Update stats
  const updateStats = useCallback(
    (updates: Partial<GameplayStats>) => {
      setStats((prev) => {
        const newStats = { ...prev, ...updates };
        if (onStatsUpdate) {
          onStatsUpdate(newStats);
        }
        return newStats;
      });
    },
    [onStatsUpdate]
  );

  // Streak events
  const handleStreakEvent = useCallback(
    (streakCount: number, accuracy: number, timing: number) => {
      const basePoints = Math.min(streakCount * 5, 50); // Max 50 points per streak event
      let bonusPoints = 0;
      let message = "";
      let eventType: GameplayEvent["type"] = "streak";

      if (streakCount >= 10) {
        bonusPoints = 25;
        message = `🔥 INSANE STREAK! ${streakCount} in a row! (+${
          basePoints + bonusPoints
        } pts)`;
        eventType = "streak";
      } else if (streakCount >= 5) {
        bonusPoints = 15;
        message = `🎯 AMAZING STREAK! ${streakCount} in a row! (+${
          basePoints + bonusPoints
        } pts)`;
        eventType = "streak";
      } else if (streakCount >= 3) {
        bonusPoints = 10;
        message = `⭐ Great streak! ${streakCount} in a row! (+${
          basePoints + bonusPoints
        } pts)`;
        eventType = "streak";
      }

      if (bonusPoints > 0) {
        const event = addEvent({
          type: eventType,
          message,
          points: basePoints + bonusPoints,
          duration: 3000,
        });

        updateStats({
          currentStreak: streakCount,
          maxStreak: Math.max(stats.maxStreak, streakCount),
          totalBonusPoints: stats.totalBonusPoints + basePoints + bonusPoints,
          lastEventTime: Date.now(),
        });

        return event;
      }

      return null;
    },
    [addEvent, updateStats, stats.maxStreak, stats.totalBonusPoints]
  );

  // Accuracy boost events
  const handleAccuracyBoost = useCallback(
    (accuracy: number) => {
      if (accuracy >= 95) {
        const bonusPoints = 20;
        const event = addEvent({
          type: "accuracy_boost",
          message: `🎤 PERFECT ACCURACY! ${accuracy}%! (+${bonusPoints} pts)`,
          points: bonusPoints,
          duration: 2500,
        });

        updateStats({
          accuracyBoosts: stats.accuracyBoosts + 1,
          totalBonusPoints: stats.totalBonusPoints + bonusPoints,
          lastEventTime: Date.now(),
        });

        return event;
      } else if (accuracy >= 90) {
        const bonusPoints = 15;
        const event = addEvent({
          type: "accuracy_boost",
          message: `🎵 Excellent accuracy! ${accuracy}%! (+${bonusPoints} pts)`,
          points: bonusPoints,
          duration: 2000,
        });

        updateStats({
          accuracyBoosts: stats.accuracyBoosts + 1,
          totalBonusPoints: stats.totalBonusPoints + bonusPoints,
          lastEventTime: Date.now(),
        });

        return event;
      }

      return null;
    },
    [addEvent, updateStats, stats.accuracyBoosts, stats.totalBonusPoints]
  );

  // Timing boost events
  const handleTimingBoost = useCallback(
    (timing: number) => {
      if (timing >= 95) {
        const bonusPoints = 20;
        const event = addEvent({
          type: "timing_boost",
          message: `⏰ PERFECT TIMING! ${timing}%! (+${bonusPoints} pts)`,
          points: bonusPoints,
          duration: 2500,
        });

        updateStats({
          timingBoosts: stats.timingBoosts + 1,
          totalBonusPoints: stats.totalBonusPoints + bonusPoints,
          lastEventTime: Date.now(),
        });

        return event;
      } else if (timing >= 90) {
        const bonusPoints = 15;
        const event = addEvent({
          type: "timing_boost",
          message: `🎶 Great timing! ${timing}%! (+${bonusPoints} pts)`,
          points: bonusPoints,
          duration: 2000,
        });

        updateStats({
          timingBoosts: stats.timingBoosts + 1,
          totalBonusPoints: stats.totalBonusPoints + bonusPoints,
          lastEventTime: Date.now(),
        });

        return event;
      }

      return null;
    },
    [addEvent, updateStats, stats.timingBoosts, stats.totalBonusPoints]
  );

  // Perfect note events
  const handlePerfectNote = useCallback(
    (accuracy: number, timing: number) => {
      if (accuracy >= 95 && timing >= 95) {
        const bonusPoints = 30;
        const event = addEvent({
          type: "perfect_note",
          message: `🌟 PERFECT NOTE! Flawless performance! (+${bonusPoints} pts)`,
          points: bonusPoints,
          duration: 3000,
        });

        updateStats({
          perfectNotes: stats.perfectNotes + 1,
          totalBonusPoints: stats.totalBonusPoints + bonusPoints,
          lastEventTime: Date.now(),
        });

        return event;
      }

      return null;
    },
    [addEvent, updateStats, stats.perfectNotes, stats.totalBonusPoints]
  );

  // Combo break events
  const handleComboBreak = useCallback(
    (brokenStreak: number) => {
      if (brokenStreak >= 5) {
        const event = addEvent({
          type: "combo_break",
          message: `💔 Streak broken at ${brokenStreak}! Keep going!`,
          points: 0,
          duration: 2000,
        });

        updateStats({
          currentStreak: 0,
          lastEventTime: Date.now(),
        });

        return event;
      }

      return null;
    },
    [addEvent, updateStats]
  );

  // Process score update and trigger events
  const processScoreUpdate = useCallback(
    (accuracy: number, timing: number, totalScore: number) => {
      const currentTime = Date.now();
      const timeSinceLastEvent = currentTime - stats.lastEventTime;

      // Only process events if enough time has passed (prevent spam)
      if (timeSinceLastEvent < 500) return;

      let newStreak = stats.currentStreak;
      const eventsTriggered: GameplayEvent[] = [];

      // Determine if this is a good performance (streak-worthy)
      const isGoodPerformance = totalScore >= 80;

      if (isGoodPerformance) {
        newStreak += 1;

        // Check for streak events
        const streakEvent = handleStreakEvent(newStreak, accuracy, timing);
        if (streakEvent) eventsTriggered.push(streakEvent);
      } else {
        // Streak broken
        if (stats.currentStreak >= 5) {
          const comboBreakEvent = handleComboBreak(stats.currentStreak);
          if (comboBreakEvent) eventsTriggered.push(comboBreakEvent);
        }
        newStreak = 0;
      }

      // Check for accuracy boost
      const accuracyEvent = handleAccuracyBoost(accuracy);
      if (accuracyEvent) eventsTriggered.push(accuracyEvent);

      // Check for timing boost
      const timingEvent = handleTimingBoost(timing);
      if (timingEvent) eventsTriggered.push(timingEvent);

      // Check for perfect note
      const perfectEvent = handlePerfectNote(accuracy, timing);
      if (perfectEvent) eventsTriggered.push(perfectEvent);

      // Update streak
      updateStats({
        currentStreak: newStreak,
      });

      return eventsTriggered;
    },
    [
      stats,
      handleStreakEvent,
      handleAccuracyBoost,
      handleTimingBoost,
      handlePerfectNote,
      handleComboBreak,
      updateStats,
    ]
  );

  // Clear all events
  const clearEvents = useCallback(() => {
    // Clear all timeouts
    eventTimeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
    eventTimeoutRefs.current.clear();

    setEvents([]);
  }, []);

  // Reset stats
  const resetStats = useCallback(() => {
    clearEvents();
    setStats({
      currentStreak: 0,
      maxStreak: 0,
      perfectNotes: 0,
      accuracyBoosts: 0,
      timingBoosts: 0,
      totalBonusPoints: 0,
      lastEventTime: 0,
    });
  }, [clearEvents]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventTimeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  return {
    events,
    stats,
    processScoreUpdate,
    clearEvents,
    resetStats,
    addEvent,
  };
}
