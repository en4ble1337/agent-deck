import type { SessionKind } from "@/domain/sessions";

const CODEX_SUBMIT = "\r";
const CODEX_NEWLINE = "\n";

export function codexDataForKeyEvent(event: KeyboardEvent): string | null {
  if (event.type !== "keydown" || event.key !== "Enter") {
    return null;
  }

  if (event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
    return CODEX_NEWLINE;
  }

  if (!event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
    return CODEX_SUBMIT;
  }

  return null;
}

export function codexSubmitData(): string {
  return CODEX_SUBMIT;
}

export function isCodexEnterEvent(kind: SessionKind, event: KeyboardEvent): boolean {
  return kind === "codex" && event.key === "Enter";
}
