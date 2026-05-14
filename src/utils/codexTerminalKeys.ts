import type { SessionKind } from "@/domain/sessions";

const CODEX_SUBMIT = "\r";
const CODEX_NEWLINE = "\n";
const CODEX_BRACKETED_PASTE_START = "\x1b[200~";
const CODEX_BRACKETED_PASTE_END = "\x1b[201~";

/**
 * Detect Shift+Enter inside a Codex session so we can send a literal newline
 * instead of the carriage-return that xterm would normally emit.
 *
 * Plain Enter is intentionally not intercepted. It flows through xterm's
 * normal `onData` handler so the PTY receives the same `\r` as any other
 * terminal session. Previous versions intercepted plain Enter and re-sent
 * `\r` manually, which could be swallowed or double-sent depending on timing.
 */
export function isCodexShiftEnter(kind: SessionKind, event: KeyboardEvent): boolean {
  return (
    kind === "codex" &&
    event.type === "keydown" &&
    event.key === "Enter" &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey
  );
}

export function codexSubmitData(): string {
  return CODEX_SUBMIT;
}

export function codexNewlineData(): string {
  return CODEX_NEWLINE;
}

export function codexQuickInputData(text: string): string {
  return text
    .replaceAll("\x1b", "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s*\r?\n\s*/g, " ");
}

export function codexQuickPasteData(text: string): string {
  return `${CODEX_BRACKETED_PASTE_START}${codexQuickInputData(text)}${CODEX_BRACKETED_PASTE_END}`;
}
