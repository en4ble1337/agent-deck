import type { SessionView } from "@/domain/sessions";

const ANSI_PATTERN =
  // eslint-disable-next-line no-control-regex
  /(?:\x1B\][^\x07]*(?:\x07|\x1B\\)|\x1B\[[0-?]*[ -/]*[@-~]|\x1B[@-Z\\-_]|\x9B[0-?]*[ -/]*[@-~])/g;
const MAX_RENDER_INPUT = 80_000;
const MAX_BUFFER_LINES = 220;
const MAX_PREVIEW_LINES = 140;
const MAX_CODEX_PREVIEW_LINES = 28;
const VIRTUAL_COLUMNS = 140;

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
export type TerminalTilePreview =
  | {
      kind: "text";
      text: string;
    }
  | {
      detail: string;
      kind: "status";
      title: string;
      tone: "needs-input" | "ready" | "working";
    };

export function terminalPreviewText(raw: string): string {
  return cleanPreview(renderTerminalScreen(raw.slice(-MAX_RENDER_INPUT)));
}

export function terminalTilePreview(
  session: SessionView,
  signal: SessionSignal,
): TerminalTilePreview {
  const preview = terminalPreviewText(session.outputTail);
  if (session.kind !== "codex") {
    return { kind: "text", text: preview };
  }

  const codexPreview = cleanCodexPreview(preview);
  if (signal === "needs-input") {
    return {
      detail: "Approval or login is waiting.",
      kind: "status",
      title: "Codex needs input",
      tone: "needs-input",
    };
  }

  if (isCodexWorking(session, signal, preview, codexPreview)) {
    return {
      detail: "Waiting for a clean response.",
      kind: "status",
      title: "Codex is working",
      tone: "working",
    };
  }

  if (codexPreview.length > 0) {
    return { kind: "text", text: codexPreview };
  }

  if (session.hasProcess) {
    return {
      detail: "Ready for the next prompt.",
      kind: "status",
      title: "Codex is ready",
      tone: "ready",
    };
  }

  return { kind: "text", text: preview };
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

function cleanCodexPreview(preview: string): string {
  const lines = preview
    .split("\n")
    .map((line) => normalizeCodexLine(line))
    .filter((line) => !isCodexNoiseLine(line));
  const result: string[] = [];
  let blankCount = 0;
  let lastTextLine = "";

  for (const line of lines) {
    if (line.length === 0) {
      blankCount += 1;
      if (blankCount <= 1 && result.length > 0) {
        result.push("");
      }
      continue;
    }
    blankCount = 0;
    if (line === lastTextLine) {
      continue;
    }
    result.push(line);
    lastTextLine = line;
  }

  return result
    .slice(-MAX_CODEX_PREVIEW_LINES)
    .join("\n")
    .trim();
}

function normalizeCodexLine(line: string): string {
  return line
    .trimEnd()
    .replace(/^[•·]\s*/, "• ")
    .replace(/^•\s*(Working|Thinking|Running|Reading|Searching|Planning)$/i, "$1")
    .trimEnd();
}

function isCodexNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return false;
  }
  const withoutBullet = trimmed.replace(/^[•·]\s*/, "");
  return (
    isCodexBusyLine(trimmed) ||
    isCodexPromptLine(trimmed) ||
    /^›\s+/.test(trimmed) ||
    /^OpenAI Codex\b/i.test(trimmed) ||
    /^model:\s+/i.test(trimmed) ||
    /^directory:\s+/i.test(trimmed) ||
    /^Tip:\s+/i.test(trimmed) ||
    /^Ignoring malformed agent role definition:/i.test(trimmed) ||
    /^Starting MCP servers/i.test(trimmed) ||
    /^K$/.test(trimmed) ||
    /^[─━═╭╮╰╯│┌┐└┘+\-\s]+$/.test(trimmed) ||
    /^[╭╮╰╯│┌┐└┘].*[╭╮╰╯│┌┐└┘]$/.test(trimmed) ||
    /^(Working|Thinking|Running|Reading|Searching|Planning|Checking|Editing|Writing|Applying|Testing|Building)\.?$/i.test(
      withoutBullet,
    )
  );
}

function isCodexWorking(
  session: SessionView,
  signal: SessionSignal,
  preview: string,
  codexPreview: string,
): boolean {
  if (!session.hasProcess || signal !== "running") {
    return false;
  }

  const lines = preview.split("\n").map((line) => normalizeCodexLine(line).trim());
  const lastBusyIndex = findLastIndex(lines, isCodexBusyLine);
  const lastPromptIndex = findLastIndex(lines, isCodexPromptLine);
  if (lastBusyIndex === -1) {
    return codexPreview.length === 0 && lastPromptIndex === -1;
  }

  const lastReadableIndex = findLastIndex(
    lines,
    (line) => line.length > 0 && !isCodexNoiseLine(line),
  );
  return lastBusyIndex > Math.max(lastPromptIndex, lastReadableIndex);
}

function isCodexBusyLine(line: string): boolean {
  return /^[•·]?\s*(Working|Thinking|Running|Reading|Searching|Planning|Checking|Editing|Writing|Applying|Testing|Building)\.?\s*$/i.test(
    line.trim(),
  );
}

function isCodexPromptLine(line: string): boolean {
  return /^gpt[-\w.]*\s+.*[·.]\s+/i.test(line.trim());
}

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) {
      return index;
    }
  }
  return -1;
}

function needsInput(raw: string): boolean {
  const preview = terminalPreviewText(raw).slice(-2400);
  return NEEDS_INPUT_PATTERNS.some((pattern) => pattern.test(preview));
}

type VirtualTerminal = {
  col: number;
  lines: string[];
  row: number;
  savedCol: number;
  savedRow: number;
};

function renderTerminalScreen(raw: string): string {
  const terminal: VirtualTerminal = {
    col: 0,
    lines: [""],
    row: 0,
    savedCol: 0,
    savedRow: 0,
  };

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === "\x1b") {
      index = consumeEscape(raw, index, terminal);
      continue;
    }
    if (char === "\x9b") {
      index = consumeCsi(raw, index + 1, terminal);
      continue;
    }
    writeTerminalChar(terminal, char);
  }

  return terminal.lines.map((line) => line.trimEnd()).join("\n");
}

function consumeEscape(raw: string, index: number, terminal: VirtualTerminal): number {
  const next = raw[index + 1];
  if (!next) {
    return index;
  }
  if (next === "[") {
    return consumeCsi(raw, index + 2, terminal);
  }
  if (next === "]") {
    return consumeOsc(raw, index + 2);
  }
  switch (next) {
    case "7":
      terminal.savedRow = terminal.row;
      terminal.savedCol = terminal.col;
      break;
    case "8":
      terminal.row = terminal.savedRow;
      terminal.col = terminal.savedCol;
      ensureLine(terminal, terminal.row);
      break;
    case "c":
      clearScreen(terminal);
      break;
    case "D":
      lineFeed(terminal);
      break;
    case "E":
      terminal.col = 0;
      lineFeed(terminal);
      break;
    case "M":
      terminal.row = Math.max(0, terminal.row - 1);
      break;
  }
  return index + 1;
}

function consumeOsc(raw: string, index: number): number {
  const bell = raw.indexOf("\x07", index);
  const st = raw.indexOf("\x1b\\", index);
  if (bell === -1 && st === -1) {
    return raw.length - 1;
  }
  if (bell !== -1 && (st === -1 || bell < st)) {
    return bell;
  }
  return st + 1;
}

function consumeCsi(raw: string, index: number, terminal: VirtualTerminal): number {
  for (let cursor = index; cursor < raw.length; cursor += 1) {
    const code = raw.charCodeAt(cursor);
    if (code >= 0x40 && code <= 0x7e) {
      applyCsi(terminal, raw.slice(index, cursor), raw[cursor]);
      return cursor;
    }
  }
  return raw.length - 1;
}

function applyCsi(terminal: VirtualTerminal, body: string, command: string) {
  const params = csiParams(body);
  switch (command) {
    case "A":
      terminal.row = Math.max(0, terminal.row - firstParam(params));
      break;
    case "B":
      terminal.row += firstParam(params);
      ensureLine(terminal, terminal.row);
      break;
    case "C":
      terminal.col += firstParam(params);
      break;
    case "D":
      terminal.col = Math.max(0, terminal.col - firstParam(params));
      break;
    case "E":
      terminal.row += firstParam(params);
      terminal.col = 0;
      ensureLine(terminal, terminal.row);
      break;
    case "F":
      terminal.row = Math.max(0, terminal.row - firstParam(params));
      terminal.col = 0;
      break;
    case "G":
      terminal.col = Math.max(0, firstParam(params) - 1);
      break;
    case "H":
    case "f":
      terminal.row = Math.max(0, firstParam(params) - 1);
      terminal.col = Math.max(0, (params[1] ?? 1) - 1);
      ensureLine(terminal, terminal.row);
      break;
    case "J":
      clearDisplay(terminal, params[0] ?? 0);
      break;
    case "K":
      clearLine(terminal, params[0] ?? 0);
      break;
    case "d":
      terminal.row = Math.max(0, firstParam(params) - 1);
      ensureLine(terminal, terminal.row);
      break;
    case "s":
      terminal.savedRow = terminal.row;
      terminal.savedCol = terminal.col;
      break;
    case "u":
      terminal.row = terminal.savedRow;
      terminal.col = terminal.savedCol;
      ensureLine(terminal, terminal.row);
      break;
  }
}

function csiParams(body: string): number[] {
  const numericBody = body.replace(/[?=><!]/g, "");
  if (numericBody.trim().length === 0) {
    return [];
  }
  return numericBody.split(";").map((part) => {
    const parsed = Number.parseInt(part, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
}

function firstParam(params: number[]): number {
  return Math.max(1, params[0] ?? 1);
}

function writeTerminalChar(terminal: VirtualTerminal, char: string) {
  switch (char) {
    case "\r":
      terminal.col = 0;
      return;
    case "\n":
      lineFeed(terminal);
      return;
    case "\b":
      terminal.col = Math.max(0, terminal.col - 1);
      return;
    case "\t":
      writeText(terminal, " ".repeat(4 - (terminal.col % 4)));
      return;
    default:
      if (isPrintable(char)) {
        writeText(terminal, char);
      }
  }
}

function writeText(terminal: VirtualTerminal, text: string) {
  for (const char of text) {
    if (terminal.col >= VIRTUAL_COLUMNS) {
      terminal.col = 0;
      lineFeed(terminal);
    }
    ensureLine(terminal, terminal.row);
    const line = terminal.lines[terminal.row].padEnd(terminal.col, " ");
    terminal.lines[terminal.row] = `${line.slice(0, terminal.col)}${char}${line.slice(
      terminal.col + 1,
    )}`;
    terminal.col += 1;
  }
}

function lineFeed(terminal: VirtualTerminal) {
  terminal.row += 1;
  ensureLine(terminal, terminal.row);
}

function ensureLine(terminal: VirtualTerminal, row: number) {
  while (terminal.lines.length <= row) {
    terminal.lines.push("");
  }
  while (terminal.lines.length > MAX_BUFFER_LINES) {
    terminal.lines.shift();
    terminal.row = Math.max(0, terminal.row - 1);
    terminal.savedRow = Math.max(0, terminal.savedRow - 1);
  }
}

function clearDisplay(terminal: VirtualTerminal, mode: number) {
  if (mode === 2 || mode === 3) {
    clearScreen(terminal);
    return;
  }
  ensureLine(terminal, terminal.row);
  if (mode === 1) {
    terminal.lines = terminal.lines.slice(terminal.row);
    terminal.row = 0;
    terminal.lines[0] = terminal.lines[0].slice(terminal.col);
    return;
  }
  terminal.lines = terminal.lines.slice(0, terminal.row + 1);
  terminal.lines[terminal.row] = terminal.lines[terminal.row].slice(0, terminal.col);
}

function clearLine(terminal: VirtualTerminal, mode: number) {
  ensureLine(terminal, terminal.row);
  const line = terminal.lines[terminal.row];
  if (mode === 2) {
    terminal.lines[terminal.row] = "";
    return;
  }
  if (mode === 1) {
    terminal.lines[terminal.row] = `${" ".repeat(terminal.col)}${line.slice(terminal.col)}`;
    return;
  }
  terminal.lines[terminal.row] = line.slice(0, terminal.col);
}

function clearScreen(terminal: VirtualTerminal) {
  terminal.lines = [""];
  terminal.row = 0;
  terminal.col = 0;
}

function cleanPreview(text: string): string {
  const fallback = stripAnsi(text)
    .replace(/\r(?!\n)/g, "\n")
    .replace(/\u0008+/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  const lines = fallback
    .split("\n")
    .map((line) => line.trimEnd())
    .slice(-MAX_PREVIEW_LINES);
  return collapseBlankLines(lines).join("\n").trimStart();
}

function collapseBlankLines(lines: string[]): string[] {
  const result: string[] = [];
  let blankCount = 0;
  for (const line of lines) {
    if (line.trim().length === 0) {
      blankCount += 1;
      if (blankCount <= 2) {
        result.push("");
      }
      continue;
    }
    blankCount = 0;
    result.push(line);
  }
  return result;
}

function isPrintable(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x20 && code !== 0x7f;
}
