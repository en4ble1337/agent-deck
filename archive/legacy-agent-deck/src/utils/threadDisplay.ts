const GENERIC_THREAD_NAMES = new Set([
  "hi",
  "hello",
  "hey",
  "yo",
  "test",
  "ok",
  "okay",
  "thanks",
  "thank you",
  "continue",
  "can you continue",
  "new agent",
  "untitled session",
]);

function normalizeGenericName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[?!.,:;]+$/g, "")
    .replace(/\s+/g, " ");
}

export function isGenericThreadName(value: string) {
  const normalized = normalizeGenericName(value);
  return normalized.length <= 3 || GENERIC_THREAD_NAMES.has(normalized);
}

function cleanContextText(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(absolutely|sure|nice|great prompt|got it|okay|ok)[.!,:]\s+/i, "")
    .replace(/^i['’]ll\s+/i, "");
}

function clampTitle(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  const clipped = value.slice(0, maxLength + 1);
  const wordBoundary = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, wordBoundary > 32 ? wordBoundary : maxLength).trim()}...`;
}

export function deriveThreadContextTitle(
  threadName: string,
  preview: string | null | undefined,
  fallback = "Untitled session",
) {
  const normalizedName = threadName.trim();
  if (!isGenericThreadName(normalizedName)) {
    return normalizedName || fallback;
  }
  const context = cleanContextText(preview ?? "");
  if (!context || normalizeGenericName(context) === normalizeGenericName(normalizedName)) {
    return normalizedName || fallback;
  }
  const sentenceMatch = context.match(/^(.{32,}?[.!?])\s/);
  const title = sentenceMatch?.[1] ?? context;
  return clampTitle(title, 72);
}
