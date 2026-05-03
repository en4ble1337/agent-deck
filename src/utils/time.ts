export function formatShortTime(timestamp: number | null): string {
  if (!timestamp) {
    return "";
  }
  const delta = Date.now() - timestamp;
  if (delta < 60_000) {
    return "now";
  }
  if (delta < 3_600_000) {
    return `${Math.floor(delta / 60_000)}m`;
  }
  if (delta < 86_400_000) {
    return `${Math.floor(delta / 3_600_000)}h`;
  }
  return `${Math.floor(delta / 86_400_000)}d`;
}

export function compactPath(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  if (parts.length <= 2) {
    return path;
  }
  return `${parts.at(-2)}/${parts.at(-1)}`;
}
