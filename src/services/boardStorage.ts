const MINIMIZED_SESSIONS_KEY = "terminal-board.minimized-session-ids";

export function readMinimizedSessionIds(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }
  const stored = window.localStorage.getItem(MINIMIZED_SESSIONS_KEY);
  if (!stored) {
    return new Set();
  }
  try {
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed)
      ? new Set(parsed.filter((value): value is string => typeof value === "string"))
      : new Set();
  } catch {
    window.localStorage.removeItem(MINIMIZED_SESSIONS_KEY);
    return new Set();
  }
}

export function writeMinimizedSessionIds(sessionIds: Set<string>) {
  window.localStorage.setItem(MINIMIZED_SESSIONS_KEY, JSON.stringify([...sessionIds]));
}
