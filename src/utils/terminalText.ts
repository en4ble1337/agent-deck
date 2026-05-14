import type { SessionView } from "@/domain/sessions";

const ANSI_PATTERN =
  // eslint-disable-next-line no-control-regex
  /(?:\x1B\][^\x07]*(?:\x07|\x1B\\)|\x1B\[[0-?]*[ -/]*[@-~]|\x1B[@-Z\\-_]|\x9B[0-?]*[ -/]*[@-~])/g;
const MAX_RENDER_INPUT = 80_000;
const MAX_BUFFER_LINES = 220;
const MAX_PREVIEW_LINES = 140;
const MAX_CODEX_PREVIEW_LINES = 28;
const MIN_SEPARATOR_LENGTH = 12;
const VIRTUAL_COLUMNS = 140;
const ANSI_LOOKBEHIND = 64;
const CODEX_OUTPUT_SETTLE_MS = 2800;

const NEEDS_INPUT_PATTERNS = [
  /\bpermission required\b/i,
  /\bapproval required\b/i,
  /\brequires approval\b/i,
  /\bwaiting for approval\b/i,
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
  /\[(?:y|yes)\/(?:n|no)\]/i,
  /\((?:y|yes)\/(?:n|no)\)/i,
];
const CODEX_APPROVAL_PATTERNS = [
  /\bwould you like to run the following command\?/i,
  /\breason:\s*do you want to allow\b/i,
  /\byes,\s*proceed\s*\(y\)/i,
  /\bdon't ask again for commands that start with\b/i,
];
const CODEX_APPROVAL_RESOLVED_PATTERNS = [
  /\byou approved\b/i,
  /\byou denied\b/i,
  /\bcancelled\b/i,
  /\bcanceled\b/i,
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
  return cleanPreview(renderTerminalScreen(renderInputTail(raw)));
}

export function terminalTilePreview(
  session: SessionView,
  signal: SessionSignal,
  now = Date.now(),
): TerminalTilePreview {
  const preview = terminalPreviewText(session.outputTail);
  if (session.kind !== "codex") {
    return { kind: "text", text: preview };
  }

  const codexPreview = cleanCodexPreview(preview);
  const codexTranscriptPreview = cleanCodexTranscriptPreview(session.outputTail);
  const codexReadablePreview = cleanCodexReadableTranscript(session.outputTail);
  if (signal === "needs-input") {
    return {
      detail: "Review the terminal prompt.",
      kind: "status",
      title: "Codex needs input",
      tone: "needs-input",
    };
  }

  if (codexTranscriptPreview.length > 0) {
    return { kind: "text", text: codexTranscriptPreview };
  }

  if (isCodexWorking(session, signal, preview, codexPreview, now)) {
    return {
      detail: "Waiting for a clean response.",
      kind: "status",
      title: "Codex is working",
      tone: "working",
    };
  }

  if (codexReadablePreview.length > 0) {
    return { kind: "text", text: codexReadablePreview };
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

export function sessionSignal(session: SessionView, now = Date.now()): SessionSignal {
  if (session.status === "failed") {
    return "failed";
  }
  if (!session.hasProcess || session.status === "exited" || session.status === "archived") {
    return "exited";
  }
  if (needsInput(session)) {
    return "needs-input";
  }
  return now - session.lastActiveAt > 45_000 ? "idle" : "running";
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

function cleanCodexTranscriptPreview(raw: string): string {
  const lines = codexTranscriptLines(raw);
  const completionIndex = findLastIndex(lines, isCodexCompletionLine);
  if (completionIndex === -1) {
    return "";
  }

  const beforeCompletion = lines.slice(0, completionIndex);
  const promptIndex = findLastIndex(beforeCompletion, isCodexUserPromptLine);
  const separatorIndex = findLastIndex(beforeCompletion, isCodexSeparatorLine);
  const startIndex = Math.max(promptIndex, separatorIndex) + 1;
  const readableLines = beforeCompletion
    .slice(startIndex)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .filter((line) => !isCodexNoiseLine(line));

  return recentUniqueLines(readableLines, MAX_CODEX_PREVIEW_LINES).join("\n").trim();
}

function cleanCodexReadableTranscript(raw: string): string {
  const readableLines = codexTranscriptLines(raw)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .filter((line) => !isCodexNoiseLine(line));

  return recentUniqueLines(readableLines, MAX_CODEX_PREVIEW_LINES).join("\n").trim();
}

function codexTranscriptLines(raw: string): string[] {
  const transcript = stripAnsi(renderInputTail(raw))
    .replace(/\r(?!\n)/g, "\n")
    .replace(/\u0008+/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  return transcript.split("\n").map((line) => normalizeCodexLine(line).trimEnd());
}

function recentUniqueLines(lines: string[], limit: number): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    const key = line.replace(/\s+/g, " ").trim();
    if (key.length === 0 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.unshift(line);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
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
    isTerminalControlFragmentLine(trimmed) ||
    isCodexCompletionLine(trimmed) ||
    isCodexSeparatorLine(trimmed) ||
    isCodexBusyLine(trimmed) ||
    isCodexStatusLine(trimmed) ||
    isCodexInternalLine(trimmed) ||
    isCodexUserPromptLine(trimmed) ||
    isCodexPromptLine(trimmed) ||
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
  now: number,
): boolean {
  if (!session.hasProcess || signal !== "running") {
    return false;
  }

  if (now - session.lastActiveAt < CODEX_OUTPUT_SETTLE_MS) {
    return true;
  }

  const lines = preview.split("\n").map((line) => normalizeCodexLine(line).trim());
  const lastBusyIndex = findLastIndex(lines, isCodexBusyLine);
  const lastStatusIndex = findLastIndex(lines, isCodexStatusLine);
  const lastInternalIndex = findLastIndex(lines, isCodexInternalLine);
  const lastPromptIndex = findLastIndex(lines, isCodexPromptLine);
  const lastHiddenActivityIndex = Math.max(lastBusyIndex, lastStatusIndex, lastInternalIndex);
  if (lastHiddenActivityIndex === -1) {
    return codexPreview.length === 0 && lastPromptIndex === -1;
  }

  const lastReadableIndex = findLastIndex(
    lines,
    (line) => line.length > 0 && !isCodexNoiseLine(line),
  );
  return lastHiddenActivityIndex > Math.max(lastPromptIndex, lastReadableIndex);
}

function isCodexBusyLine(line: string): boolean {
  return /^[•·]?\s*(Working|Thinking|Running|Reading|Searching|Planning|Checking|Editing|Writing|Applying|Testing|Building)\.?\s*$/i.test(
    line.trim(),
  );
}

function isCodexStatusLine(line: string): boolean {
  const withoutBullet = line.trim().replace(/^[•·]\s*/, "");
  return (
    /^(Working|Thinking|Running|Reading|Searching|Planning|Checking|Editing|Writing|Applying|Testing|Building)\b/i.test(
      withoutBullet,
    ) &&
    /\b(?:esc\s+to|background terminals?|\/ps\b|interrupt|running)\b/i.test(withoutBullet)
  );
}

function isCodexCompletionLine(line: string): boolean {
  return /^─?\s*Worked for\s+\d+/i.test(line.trim());
}

function isCodexSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.length >= MIN_SEPARATOR_LENGTH &&
    /^[─━═\-]+$/.test(trimmed)
  );
}

function isCodexInternalLine(line: string): boolean {
  const withoutBullet = line.trim().replace(/^[•·]\s*/, "");
  return /^(Called|Listed|Ran|Read|Opened|Searched|Viewed|Edited|Updated|Wrote|Applied|Patched|Checked|Tested|Built|Scanning|Inspecting)\b/i.test(
    withoutBullet,
  );
}

function isCodexUserPromptLine(line: string): boolean {
  return /^›\s*/.test(line.trim());
}

function isTerminalControlFragmentLine(line: string): boolean {
  return /^\[?\??\d{1,4}(?:;\d{1,4})*[hl]$/.test(line.trim());
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

function needsInput(session: SessionView): boolean {
  const preview = terminalPreviewText(session.outputTail).slice(-2400);
  const searchablePreview =
    session.kind === "codex" ? withoutActiveCodexDraft(preview) : preview;

  if (session.kind === "codex") {
    const rawTail = stripAnsi(session.outputTail.slice(-6000));
    if (hasPendingCodexApproval(searchablePreview) || hasPendingCodexApproval(rawTail)) {
      return true;
    }
    return NEEDS_INPUT_PATTERNS.some((pattern) => pattern.test(searchablePreview));
  }

  if (NEEDS_INPUT_PATTERNS.some((pattern) => pattern.test(searchablePreview))) {
    return true;
  }

  return false;
}

function hasPendingCodexApproval(text: string): boolean {
  const approvalIndex = lastPatternIndex(text, CODEX_APPROVAL_PATTERNS);
  if (approvalIndex === -1) {
    return false;
  }
  return approvalIndex > lastPatternIndex(text, CODEX_APPROVAL_RESOLVED_PATTERNS);
}

function lastPatternIndex(text: string, patterns: RegExp[]): number {
  let lastIndex = -1;
  for (const pattern of patterns) {
    const globalPattern = new RegExp(pattern.source, `${pattern.flags.replace("g", "")}g`);
    let match: RegExpExecArray | null;
    while ((match = globalPattern.exec(text)) !== null) {
      lastIndex = Math.max(lastIndex, match.index);
      if (match[0].length === 0) {
        globalPattern.lastIndex += 1;
      }
    }
  }
  return lastIndex;
}

function withoutActiveCodexDraft(preview: string): string {
  const lines = preview.split("\n");
  const promptIndex = findLastIndex(lines, isCodexPromptLine);
  if (promptIndex === -1) {
    return preview;
  }

  const draftStart = findLastIndex(
    lines.slice(0, promptIndex),
    (line) => isCodexUserPromptLine(normalizeCodexLine(line)),
  );
  if (draftStart === -1) {
    return preview;
  }

  return lines
    .filter((_, index) => index < draftStart || index > promptIndex)
    .join("\n");
}

type VirtualTerminal = {
  col: number;
  lines: string[];
  row: number;
  savedCol: number;
  savedRow: number;
};

function renderInputTail(raw: string): string {
  if (raw.length <= MAX_RENDER_INPUT) {
    return raw;
  }
  return raw.slice(ansiSafeTailStart(raw));
}

function ansiSafeTailStart(raw: string): number {
  const desiredStart = Math.max(0, raw.length - MAX_RENDER_INPUT);
  const lookbehindStart = Math.max(0, desiredStart - ANSI_LOOKBEHIND);

  for (let index = desiredStart - 1; index >= lookbehindStart; index -= 1) {
    const char = raw[index];
    if (char !== "\x1b" && char !== "\x9b") {
      continue;
    }
    const sequenceEnd = ansiSequenceEnd(raw, index);
    if (sequenceEnd >= desiredStart || sequenceEnd === raw.length - 1) {
      return index;
    }
    break;
  }

  return desiredStart;
}

function ansiSequenceEnd(raw: string, index: number): number {
  if (raw[index] === "\x9b") {
    return csiEnd(raw, index + 1);
  }

  const next = raw[index + 1];
  if (!next) {
    return index;
  }
  if (next === "[") {
    return csiEnd(raw, index + 2);
  }
  if (next === "]" || next === "P" || next === "_" || next === "^" || next === "X") {
    return stringControlEnd(raw, index + 2);
  }
  return index + 1;
}

function csiEnd(raw: string, index: number): number {
  for (let cursor = index; cursor < raw.length; cursor += 1) {
    const code = raw.charCodeAt(cursor);
    if (isCsiFinal(code)) {
      return cursor;
    }
  }
  return raw.length - 1;
}

function isCsiFinal(code: number): boolean {
  return code >= 0x40 && code <= 0x7e;
}

function stringControlEnd(raw: string, index: number): number {
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
  if (next === "P" || next === "_" || next === "^" || next === "X") {
    return stringControlEnd(raw, index + 2);
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
    case "(":
    case ")":
    case "*":
    case "+":
    case "-":
    case ".":
    case "/":
    case "#":
    case "%":
      return Math.min(raw.length - 1, index + 2);
  }
  return index + 1;
}

function consumeOsc(raw: string, index: number): number {
  return stringControlEnd(raw, index);
}

function consumeCsi(raw: string, index: number, terminal: VirtualTerminal): number {
  const cursor = csiEnd(raw, index);
  if (cursor < raw.length && isCsiFinal(raw.charCodeAt(cursor))) {
    applyCsi(terminal, raw.slice(index, cursor), raw[cursor]);
  }
  return cursor;
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
  while (lines.length > 0 && isTerminalControlFragmentLine(lines[0])) {
    lines.shift();
  }
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
