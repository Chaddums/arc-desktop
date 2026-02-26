/**
 * useEventTimer — Event schedule management with live countdown tick.
 * Source: MetaForge events-schedule API.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { fetchEventsSchedule } from "../services/metaforge";
import type { GameEvent } from "../types";

/** Track previous active event keys for new-event detection */
function getEventKey(e: GameEvent) {
  return `${e.name}|${e.map}|${e.startTime}`;
}

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min

export function useEventTimer() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const refreshRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEventsSchedule();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  // Tick every second for countdown
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  // Auto-refresh events
  useEffect(() => {
    loadEvents();
    refreshRef.current = setInterval(loadEvents, REFRESH_INTERVAL);
    return () => clearInterval(refreshRef.current);
  }, [loadEvents]);

  const prevActiveKeysRef = useRef<Set<string>>(new Set());

  const activeEvents = useMemo(
    () => (events || []).filter((e) => now >= e.startTime && now < e.endTime),
    [events, now]
  );

  // Detect newly active events and notify desktop
  useEffect(() => {
    const prevKeys = prevActiveKeysRef.current;
    const currentKeys = new Set(activeEvents.map(getEventKey));

    for (const event of activeEvents) {
      const key = getEventKey(event);
      if (!prevKeys.has(key)) {
        window.arcDesktop?.notifyEventStarted({ name: event.name, map: event.map });
      }
    }

    prevActiveKeysRef.current = currentKeys;
  }, [activeEvents]);

  const upcomingEvents = useMemo(
    () =>
      (events || [])
        .filter((e) => now < e.startTime)
        .sort((a, b) => a.startTime - b.startTime),
    [events, now]
  );

  return {
    events,
    activeEvents,
    upcomingEvents,
    selectedMap,
    setSelectedMap,
    now,
    loading,
    error,
    refresh: loadEvents,
  };
}
