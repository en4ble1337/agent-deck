import type { CommandPreset } from "@/domain/presets";
import type {
  SessionAttachment,
  SessionAttachmentSaveRequest,
  SessionCreateRequest,
  SessionKind,
  SessionOutputEvent,
  SessionStatus,
  SessionStatusEvent,
  SessionView,
} from "@/domain/sessions";
import type { Workspace, WorkspacePatch } from "@/domain/workspaces";
import { WORKSPACE_ACCENTS } from "@/domain/workspaces";

type MockEvent<T> = { event: string; id: number; payload: T };
type MockListener<T> = (event: MockEvent<T>) => void;

type MockState = {
  workspaces: Workspace[];
  sessions: SessionView[];
};

const STORAGE_KEY = "terminal-board.preview-state";
const outputListeners = new Set<MockListener<SessionOutputEvent>>();
const statusListeners = new Set<MockListener<SessionStatusEvent>>();
let state: MockState = readState();

export const mockBackend = {
  workspaceList: async (): Promise<Workspace[]> => state.workspaces,

  workspaceAdd: async (path: string): Promise<Workspace> => {
    const timestamp = Date.now();
    const workspace: Workspace = {
      id: crypto.randomUUID(),
      name: workspaceName(path),
      path,
      accent: WORKSPACE_ACCENTS[state.workspaces.length % WORKSPACE_ACCENTS.length].value,
      isOpen: true,
      sortIndex: state.workspaces.length,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastActiveAt: timestamp,
    };
    state = { ...state, workspaces: [workspace, ...state.workspaces] };
    writeState();
    return workspace;
  },

  workspaceUpdate: async (id: string, patch: WorkspacePatch): Promise<Workspace> => {
    const timestamp = Date.now();
    const workspace = requireWorkspace(id);
    const updated: Workspace = {
      ...workspace,
      ...patch,
      updatedAt: timestamp,
      lastActiveAt: timestamp,
    };
    state = {
      ...state,
      workspaces: state.workspaces.map((candidate) =>
        candidate.id === id ? updated : candidate,
      ),
    };
    writeState();
    return updated;
  },

  workspaceClose: async (id: string): Promise<Workspace> =>
    mockBackend.workspaceUpdate(id, { isOpen: false }),

  workspaceRemove: async (id: string): Promise<void> => {
    state = {
      workspaces: state.workspaces.filter((workspace) => workspace.id !== id),
      sessions: state.sessions.filter((session) => session.workspaceId !== id),
    };
    writeState();
  },

  presetList: async (): Promise<CommandPreset[]> => [
    preset("terminal", "Terminal", "terminal", ""),
    preset("codex", "Codex", "codex", "codex"),
    preset("claude", "Claude", "claude", "claude"),
    preset("custom", "Custom", "custom", ""),
  ],

  sessionList: async (
    workspaceId?: string,
    includeArchived = false,
  ): Promise<SessionView[]> =>
    state.sessions
      .filter((session) => !workspaceId || session.workspaceId === workspaceId)
      .filter((session) => includeArchived || !session.isArchived),

  sessionCreate: async (request: SessionCreateRequest): Promise<SessionView> => {
    const workspace = requireWorkspace(request.workspaceId);
    const timestamp = Date.now();
    const session: SessionView = {
      id: crypto.randomUUID(),
      workspaceId: workspace.id,
      presetId: request.kind,
      kind: request.kind,
      title: titleForKind(request.kind, request.customCommand),
      command: commandForKind(request.kind, request.customCommand),
      args: [],
      cwd: workspace.path,
      status: "created",
      tileIndex: state.sessions.length,
      tileSize: "medium",
      isArchived: false,
      isPinned: false,
      transcriptPath: "",
      createdAt: timestamp,
      startedAt: null,
      lastActiveAt: timestamp,
      exitedAt: null,
      exitCode: null,
      outputTail: "",
      hasProcess: false,
    };
    state = { ...state, sessions: [session, ...state.sessions] };
    writeState();
    return session;
  },

  sessionStart: async (sessionId: string): Promise<SessionView> => {
    const session = updateSession(sessionId, {
      status: "running",
      hasProcess: true,
      startedAt: Date.now(),
      outputTail: `${requireSession(sessionId).outputTail}${startupText(requireSession(sessionId))}`,
    });
    emitStatus(session, "running");
    return session;
  },

  sessionWrite: async (sessionId: string, data: string): Promise<void> => {
    const session = requireSession(sessionId);
    const text = normalizeTerminalInput(data);
    if (!text.trim()) {
      return;
    }
    const output = responseFor(session, text);
    updateSession(sessionId, {
      outputTail: `${session.outputTail}${output}`,
      lastActiveAt: Date.now(),
      hasProcess: true,
      status: "running",
    });
    emitOutput(session, output);
  },

  sessionSaveAttachment: async (
    _sessionId: string,
    _request: SessionAttachmentSaveRequest,
  ): Promise<SessionAttachment> => {
    throw new Error("Image paste needs the desktop app so Workspace Deck can save a local file path.");
  },

  sessionResize: async (): Promise<void> => {},

  sessionStop: async (sessionId: string): Promise<SessionView> => {
    const session = updateSession(sessionId, {
      status: "exited",
      hasProcess: false,
      exitedAt: Date.now(),
    });
    emitStatus(session, "exited");
    return session;
  },

  sessionRestart: async (sessionId: string): Promise<SessionView> => {
    const session = updateSession(sessionId, {
      status: "running",
      hasProcess: true,
      startedAt: Date.now(),
      exitedAt: null,
      exitCode: null,
      outputTail: `${requireSession(sessionId).outputTail}\r\nRestarted preview session.\r\n`,
    });
    emitStatus(session, "running");
    return session;
  },

  sessionArchive: async (sessionId: string): Promise<SessionView> =>
    updateSession(sessionId, {
      isArchived: true,
      status: "archived",
      hasProcess: false,
      exitedAt: Date.now(),
    }),

  sessionUnarchive: async (sessionId: string): Promise<SessionView> =>
    updateSession(sessionId, {
      isArchived: false,
      status: "exited",
    }),

  sessionDelete: async (sessionId: string): Promise<void> => {
    state = {
      ...state,
      sessions: state.sessions.filter((session) => session.id !== sessionId),
    };
    writeState();
  },

  sessionReadTranscript: async (sessionId: string): Promise<string> =>
    requireSession(sessionId).outputTail,

  onSessionOutput: (callback: MockListener<SessionOutputEvent>): (() => void) => {
    outputListeners.add(callback);
    return () => outputListeners.delete(callback);
  },

  onSessionStatus: (callback: MockListener<SessionStatusEvent>): (() => void) => {
    statusListeners.add(callback);
    return () => statusListeners.delete(callback);
  },
};

function readState(): MockState {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as MockState;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }
  return seedState();
}

function seedState(): MockState {
  const now = Date.now();
  const workspaces: Workspace[] = [
    workspace("preview-agent-deck", "Projects/agent-deck", WORKSPACE_ACCENTS[0].value, now - 6000),
    workspace("preview-terminal-board", "Projects/terminal-board", WORKSPACE_ACCENTS[1].value, now - 9000),
  ];
  const sessions: SessionView[] = [
    session(workspaces[0], "codex", now - 5000, "Codex is ready. Ask from the tile or open focus.\r\n"),
    session(workspaces[0], "terminal", now - 3000, "PS Projects/agent-deck> npm run typecheck\r\n"),
    session(workspaces[1], "claude", now - 7000, "Claude preview session waiting for input.\r\n"),
  ];
  return { workspaces, sessions };
}

function writeState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function workspace(id: string, path: string, accent: string, timestamp: number): Workspace {
  return {
    id,
    name: workspaceName(path),
    path,
    accent,
    isOpen: true,
    sortIndex: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastActiveAt: timestamp,
  };
}

function session(
  workspace: Workspace,
  kind: SessionKind,
  timestamp: number,
  outputTail: string,
): SessionView {
  return {
    id: crypto.randomUUID(),
    workspaceId: workspace.id,
    presetId: kind,
    kind,
    title: titleForKind(kind),
    command: commandForKind(kind),
    args: [],
    cwd: workspace.path,
    status: "running",
    tileIndex: 0,
    tileSize: "medium",
    isArchived: false,
    isPinned: false,
    transcriptPath: "",
    createdAt: timestamp,
    startedAt: timestamp,
    lastActiveAt: timestamp,
    exitedAt: null,
    exitCode: null,
    outputTail,
    hasProcess: true,
  };
}

function preset(id: string, name: string, kind: SessionKind, command: string): CommandPreset {
  return {
    id,
    name,
    kind,
    command,
    args: [],
    env: {},
    icon: id,
    workspaceId: null,
  };
}

function requireWorkspace(id: string): Workspace {
  const workspace = state.workspaces.find((candidate) => candidate.id === id);
  if (!workspace) {
    throw new Error("Workspace not found");
  }
  return workspace;
}

function requireSession(id: string): SessionView {
  const session = state.sessions.find((candidate) => candidate.id === id);
  if (!session) {
    throw new Error("Session not found");
  }
  return session;
}

function updateSession(id: string, patch: Partial<SessionView>): SessionView {
  const existing = requireSession(id);
  const updated = { ...existing, ...patch, lastActiveAt: Date.now() };
  state = {
    ...state,
    sessions: state.sessions.map((session) => (session.id === id ? updated : session)),
  };
  writeState();
  return updated;
}

function emitOutput(session: SessionView, data: string) {
  const event = {
    event: "session/output",
    id: Date.now(),
    payload: {
      sessionId: session.id,
      workspaceId: session.workspaceId,
      data,
    },
  };
  for (const listener of outputListeners) {
    listener(event);
  }
}

function emitStatus(session: SessionView, status: SessionStatus) {
  const event = {
    event: "session/status",
    id: Date.now(),
    payload: {
      sessionId: session.id,
      workspaceId: session.workspaceId,
      status,
      exitCode: null,
    },
  };
  for (const listener of statusListeners) {
    listener(event);
  }
}

function workspaceName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? "Workspace";
}

function titleForKind(kind: SessionKind, customCommand?: string): string {
  if (kind === "custom") {
    return customCommand?.trim() || "Custom";
  }
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function commandForKind(kind: SessionKind, customCommand?: string): string {
  if (kind === "custom") {
    return customCommand?.trim() || "";
  }
  return kind === "terminal" ? "" : kind;
}

function startupText(session: SessionView): string {
  if (session.outputTail.length > 0) {
    return "";
  }
  return `${session.title} preview session started in ${session.cwd}\r\n`;
}

function normalizeTerminalInput(data: string): string {
  return data
    .replace(/\x1b\[200~/g, "")
    .replace(/\x1b\[201~/g, "")
    .replace(/\r/g, "\n")
    .trim();
}

function responseFor(session: SessionView, text: string): string {
  if (session.kind === "codex") {
    return `\r\n> ${text}\r\nCodex preview received this prompt. Live agent execution runs in the Tauri app.\r\n`;
  }
  if (text.toLowerCase() === "dir" || text.toLowerCase() === "ls") {
    return `\r\n${text}\r\nAGENTS.md  README.md  docs  src  src-tauri\r\n`;
  }
  return `\r\n${text}\r\nPreview terminal accepted the command.\r\n`;
}
