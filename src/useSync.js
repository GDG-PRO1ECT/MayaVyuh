/**
 * MayaVyuh — Sync Layer
 * =====================
 * Currently uses localStorage + BroadcastChannel for same-browser cross-tab sync.
 *
 * TO SWAP FOR DJANGO CHANNELS (WebSocket):
 *   1. Replace the body of `useSyncState` with a useEffect that:
 *      - Opens a WebSocket: const ws = new WebSocket("ws://yourserver/ws/maya/")
 *      - On ws.onmessage: parse JSON, update local state
 *      - Replace setValue with a function that sends ws.send(JSON.stringify({key, value}))
 *   2. Replace `broadcastEvent` with ws.send({ type: 'event', ...data })
 *   3. Replace `listenForEvents` with a ws.onmessage handler that filters by type
 *
 * MongoDB on the Django side stores the same keys as used here.
 * Keys: maya_teams, maya_words, maya_timers, maya_alerts, maya_winners, maya_event_state
 */

import { useState, useEffect, useRef, useCallback } from "react";

const CHANNEL_NAME = "mayavyuh_sync";
let _bc = null;
function getBroadcastChannel() {
  if (!_bc) {
    try { _bc = new BroadcastChannel(CHANNEL_NAME); } catch (e) { _bc = null; }
  }
  return _bc;
}

export function useSyncState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });

  // Write to localStorage whenever value changes
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);

  // Listen for changes from other tabs via storage event
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === key && e.newValue) {
        try { setValue(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key]);

  // Listen via BroadcastChannel (same-tab updates don't trigger storage event)
  useEffect(() => {
    const bc = getBroadcastChannel();
    if (!bc) return;
    const handler = (e) => {
      if (e.data?.key === key) {
        try { setValue(e.data.value); } catch {}
      }
    };
    bc.addEventListener("message", handler);
    return () => bc.removeEventListener("message", handler);
  }, [key]);

  const setValueAndBroadcast = useCallback((updater) => {
    setValue(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try { window.localStorage.setItem(key, JSON.stringify(next)); } catch {}
      const bc = getBroadcastChannel();
      if (bc) bc.postMessage({ key, value: next });
      return next;
    });
  }, [key]);

  return [value, setValueAndBroadcast];
}

/**
 * Broadcast a one-time event (penalty, disqualification, admin message)
 * to all open tabs. Not persisted.
 *
 * Django Channels replacement:
 *   ws.send(JSON.stringify({ type: "event", eventType, payload }))
 */
export function broadcastEvent(eventType, payload = {}) {
  const bc = getBroadcastChannel();
  if (bc) bc.postMessage({ _event: true, eventType, payload, ts: Date.now() });
  // Also dispatch on the same tab
  window.dispatchEvent(new CustomEvent("maya_event", { detail: { eventType, payload } }));
}

/**
 * Listen for one-time events broadcast from admin or other players.
 *
 * Django Channels replacement:
 *   ws.onmessage = (e) => { const d = JSON.parse(e.data); if(d.type==='event') handler(d); }
 */
export function useEventListener(handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const bc = getBroadcastChannel();
    const bcHandler = (e) => {
      if (e.data?._event) handlerRef.current(e.data.eventType, e.data.payload);
    };
    const windowHandler = (e) => {
      handlerRef.current(e.detail.eventType, e.detail.payload);
    };
    if (bc) bc.addEventListener("message", bcHandler);
    window.addEventListener("maya_event", windowHandler);
    return () => {
      if (bc) bc.removeEventListener("message", bcHandler);
      window.removeEventListener("maya_event", windowHandler);
    };
  }, []);
}

export { useState, useEffect, useRef, useCallback };