import type { SessionView } from "@/domain/sessions";

const ANSI_PATTERN =
  // eslint-disable-next-line no-control-regex
  /(?:\x1B\][^\x07]*(?:\x07|\x1B\\)|\x1B\[[0-?]*[ -/]*[@-~]|\x1B[@-Z\\-_]|\x9B[0-?]*[ -/]*[@-~])/g;

const NEEDS_INPUT_PATTERNS = [
  /\bpermission\b/i,
  /\bapproval\b/i,
  /\bapprove\b/i,
  /\ballow\b/i,
  /\bdeny\b/i,
  /\bconfirm\b/i,
  /\bpassword\b/i,
  /\bauthenticate\b/i,
  /\bsign in\b/i,
  /\blogin\b/i,
  /\bpress enter\b/i,
  /\bpress any key\b/i,
  /\bcontinue\?/i,
  /\bproceed\?/i,
  /\bare you sure\b/i,
  /\bdo you want to\b/i,
  /\[(?:y|yes)\/(?:n|no)\]/i,
  /\((?:y|yes)\/(?:n|no)\)/i,
];

export type SessionSignal = "needs-input" | "running" | "idle" | "exited" | "failed";

export function terminalPreviewText(raw: string): string {
  return stripAnsi(raw)
    .replace(/\r(?!\n)/g, "\n")
    .replace(/\u0008+/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trimStart();
}

export function sessionSignal(session: SessionView): SessionSignal {
  if (session.status === "failed") {
    return "failed";
  }
  if (!session.hasProcess || session.status === "exited" || session.status === "archived") {
    return "exited";
  }
  if (needsInput(session.outputTail)) {
    return "needs-input";
  }
  return Date.now() - session.lastActiveAt > 45_000 ? "idle" : "running";
}

export function sessionSignalLabel(signal: SessionSignal): string {
  switch (signal) {
    case "needs-input":
      return "Needs input";
    case "running":
      return "Running";
    case "idle":
      return "Idle";
    case "failed":
      return "Failed";
    case "exited":
      return "Exited";
  }
}

function stripAnsi(raw: string): string {
  return raw.replace(ANSI_PATTERN, "");
}

function needsInput(raw: string): boolean {
  const preview = terminalPreviewText(raw).slice(-2400);
  return NEEDS_INPUT_PATTERNS.some((pattern) => pattern.test(preview));
}
