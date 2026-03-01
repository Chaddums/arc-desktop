/**
 * useEventTimer — Event schedule management with live countdown tick.
 * Source: MetaForge events-schedule API.
 * Emits batched event alerts for overlay toast (started/ended).
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { fetchEventsSchedule } from "../services/metaforge";
import type { GameEvent } from "../types";

/** Track previous active event keys for new-event detection */
function getEventKey(e: GameEvent) {
  return `${e.name}|${e.map}|${e.startTime}`;
}

export interface EventAlert {
  id: string;
  type: "started" | "ended";
  events: GameEvent[];
  timestamp: number;
}

let alertIdCounter = 0;

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min

export function useEventTimer() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventAlerts, setEventAlerts] = useState<EventAlert[]>([]);
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
  const prevActiveMapRef = useRef<Map<string, GameEvent>>(new Map());
  const initializedRef = useRef(false);

  const activeEvents = useMemo(
    () => (events || []).filter((e) => now >= e.startTime && now < e.endTime),
    [events, now]
  );

  // Detect newly started and ended events, emit batched alerts
  useEffect(() => {
    const prevKeys = prevActiveKeysRef.current;
    const prevMap = prevActiveMapRef.current;
    const currentKeys = new Set(activeEvents.map(getEventKey));

    // Skip alerts on first mount (don't alert for already-active events)
    if (!initializedRef.current) {
      initializedRef.current = true;
      prevActiveKeysRef.current = currentKeys;
      prevActiveMapRef.current = new Map(activeEvents.map((e) => [getEventKey(e), e]));
      return;
    }

    // Newly started
    const started: GameEvent[] = [];
    for (const event of activeEvents) {
      if (!prevKeys.has(getEventKey(event))) started.push(event);
    }

    // Newly ended
    const ended: GameEvent[] = [];
    for (const key of prevKeys) {
      if (!currentKeys.has(key)) {
        const event = prevMap.get(key);
        if (event) ended.push(event);
      }
    }

    const newAlerts: EventAlert[] = [];
    if (started.length > 0) {
      newAlerts.push({
        id: `ea-${++alertIdCounter}`,
        type: "started",
        events: started,
        timestamp: Date.now(),
      });
      // Play audio via main process
      if (started.length > 0) {
        window.arcDesktop?.notifyEventStarted({ name: started[0].name, map: started[0].map });
      }
    }
    if (ended.length > 0) {
      newAlerts.push({
        id: `ea-${++alertIdCounter}`,
        type: "ended",
        events: ended,
        timestamp: Date.now(),
      });
    }

    if (newAlerts.length > 0) {
      setEventAlerts((prev) => [...prev, ...newAlerts]);
    }

    prevActiveKeysRef.current = currentKeys;
    prevActiveMapRef.current = new Map(activeEvents.map((e) => [getEventKey(e), e]));
  }, [activeEvents]);

  const dismissAlert = useCallback((id: string) => {
    setEventAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

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
    eventAlerts,
    dismissAlert,
    selectedMap,
    setSelectedMap,
    now,
    loading,
    error,
    refresh: loadEvents,
  };
}
