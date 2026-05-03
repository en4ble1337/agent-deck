export type SessionStatus =
  | "created"
  | "starting"
  | "running"
  | "waiting"
  | "exited"
  | "failed"
  | "archived";

export type SessionKind =
  | "terminal"
  | "codex"
  | "claude"
  | "hermes"
  | "custom";

export type TerminalSession = {
  id: string;
  workspaceId: string;
  presetId: string | null;
  kind: SessionKind;
  title: string;
  command: string;
  args: string[];
  cwd: string;
  status: SessionStatus;
  tileIndex: number;
  tileSize: "small" | "medium" | "large";
  isArchived: boolean;
  isPinned: boolean;
  transcriptPath: string;
  createdAt: number;
  startedAt: number | null;
  lastActiveAt: number;
  exitedAt: number | null;
  exitCode: number | null;
};

export type SessionView = TerminalSession & {
  outputTail: string;
  hasProcess: boolean;
};

export type SessionCreateRequest = {
  workspaceId: string;
  kind: SessionKind;
  customCommand?: string;
};

export type SessionOutputEvent = {
  sessionId: string;
  workspaceId: string;
  data: string;
};

export type SessionStatusEvent = {
  sessionId: string;
  workspaceId: string;
  status: SessionStatus;
  exitCode: number | null;
};
