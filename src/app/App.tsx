import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Activity, FolderPlus, Layers3 } from "lucide-react";
import type {
  SessionKind,
  SessionOutputEvent,
  SessionStatusEvent,
  SessionView,
} from "@/domain/sessions";
import type { Workspace } from "@/domain/workspaces";
import FocusedSessionView from "@/features/focused-session/FocusedSessionView";
import TileBoard from "@/features/tile-board/TileBoard";
import WorkspaceSidebar from "@/features/workspace-sidebar/WorkspaceSidebar";
import {
  sessionArchive,
  sessionCreate,
  sessionDelete,
  sessionList,
  sessionRestart,
  sessionStart,
  sessionStop,
  sessionWrite,
  workspaceAdd,
  workspaceClose,
  workspaceList,
  workspaceUpdate,
} from "@/services/ipc";
import { onSessionOutput, onSessionStatus } from "@/services/events";

const DEFAULT_COLS = 100;
const DEFAULT_ROWS = 30;

export default function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [nextWorkspaces, nextSessions] = await Promise.all([
      workspaceListSafe(),
      sessionList(undefined, false),
    ]);
    setWorkspaces(nextWorkspaces);
    setSessions(nextSessions);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch((caught: unknown) => {
      setError(errorMessage(caught));
      setIsLoading(false);
    });
  }, [refresh]);

  useEffect(() => {
    const unlisteners: Array<() => void> = [];
    onSessionOutput((event) => {
      applyOutputEvent(event.payload, setSessions);
    }).then((unlisten) => unlisteners.push(unlisten));
    onSessionStatus((event) => {
      applyStatusEvent(event.payload, setSessions);
    }).then((unlisten) => unlisteners.push(unlisten));
    return () => {
      for (const unlisten of unlisteners) {
        unlisten();
      }
    };
  }, []);

  const openWorkspaces = useMemo(
    () => workspaces.filter((workspace) => workspace.isOpen),
    [workspaces],
  );
  const selectedWorkspace = useMemo(
    () => openWorkspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null,
    [openWorkspaces, selectedWorkspaceId],
  );
  const focusedSession = useMemo(
    () => sessions.find((session) => session.id === focusedSessionId) ?? null,
    [focusedSessionId, sessions],
  );
  const focusedWorkspace = useMemo(
    () =>
      focusedSession
        ? workspaces.find((workspace) => workspace.id === focusedSession.workspaceId) ?? null
        : null,
    [focusedSession, workspaces],
  );

  const runAction = useCallback(async (action: () => Promise<void>) => {
    try {
      setError(null);
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, []);

  const handleAddWorkspace = useCallback(() => {
    runAction(async () => {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Add workspace",
      });
      if (typeof selected !== "string") {
        return;
      }
      const workspace = await workspaceAdd(selected);
      setWorkspaces((current) => upsertById(current, workspace));
      setSelectedWorkspaceId(workspace.id);
    });
  }, [runAction]);

  const handleRenameWorkspace = useCallback(
    (workspace: Workspace) => {
      const name = window.prompt("Workspace name", workspace.name);
      if (name === null) {
        return;
      }
      runAction(async () => {
        const updated = await workspaceUpdate(workspace.id, { name });
        setWorkspaces((current) => upsertById(current, updated));
      });
    },
    [runAction],
  );

  const handleChangeWorkspaceColor = useCallback(
    (workspace: Workspace) => {
      const accent = window.prompt("Workspace color", workspace.accent);
      if (!accent) {
        return;
      }
      runAction(async () => {
        const updated = await workspaceUpdate(workspace.id, { accent });
        setWorkspaces((current) => upsertById(current, updated));
      });
    },
    [runAction],
  );

  const handleCloseWorkspace = useCallback(
    (workspace: Workspace) => {
      runAction(async () => {
        const updated = await workspaceClose(workspace.id);
        setWorkspaces((current) => upsertById(current, updated));
        if (selectedWorkspaceId === workspace.id) {
          setSelectedWorkspaceId(null);
        }
      });
    },
    [runAction, selectedWorkspaceId],
  );

  const handleCreateSession = useCallback(
    (workspaceId: string, kind: SessionKind) => {
      runAction(async () => {
        const customCommand =
          kind === "custom"
            ? window.prompt("Command to run in this workspace", "")?.trim()
            : undefined;
        if (kind === "custom" && !customCommand) {
          return;
        }
        const created = await sessionCreate({ workspaceId, kind, customCommand });
        setSessions((current) => upsertById(current, created));
        const started = await sessionStart(created.id, DEFAULT_COLS, DEFAULT_ROWS);
        setSessions((current) => upsertById(current, started));
        setFocusedSessionId(started.id);
      });
    },
    [runAction],
  );

  const handleStopSession = useCallback(
    (sessionId: string) => {
      runAction(async () => {
        const stopped = await sessionStop(sessionId);
        setSessions((current) => upsertById(current, stopped));
      });
    },
    [runAction],
  );

  const handleRestartSession = useCallback(
    (sessionId: string) => {
      runAction(async () => {
        const restarted = await sessionRestart(sessionId, DEFAULT_COLS, DEFAULT_ROWS);
        setSessions((current) => upsertById(current, restarted));
      });
    },
    [runAction],
  );

  const handleWriteToSession = useCallback(async (sessionId: string, data: string) => {
    try {
      setError(null);
      await sessionWrite(sessionId, data);
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const handleArchiveSession = useCallback(
    (sessionId: string) => {
      runAction(async () => {
        const archived = await sessionArchive(sessionId);
        setSessions((current) => upsertById(current, archived));
        if (focusedSessionId === sessionId) {
          setFocusedSessionId(null);
        }
      });
    },
    [focusedSessionId, runAction],
  );

  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      if (!window.confirm("Delete this session and transcript?")) {
        return;
      }
      runAction(async () => {
        await sessionDelete(sessionId, true);
        setSessions((current) => current.filter((session) => session.id !== sessionId));
        if (focusedSessionId === sessionId) {
          setFocusedSessionId(null);
        }
      });
    },
    [focusedSessionId, runAction],
  );

  if (focusedSession && focusedWorkspace) {
    return (
      <FocusedSessionView
        session={focusedSession}
        workspace={focusedWorkspace}
        onBack={() => setFocusedSessionId(null)}
        onArchive={() => handleArchiveSession(focusedSession.id)}
        onDelete={() => handleDeleteSession(focusedSession.id)}
        onRestart={() => handleRestartSession(focusedSession.id)}
        onStop={() => handleStopSession(focusedSession.id)}
      />
    );
  }

  return (
    <main className="app-shell">
      <WorkspaceSidebar
        sessions={sessions}
        workspaces={openWorkspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        onAddWorkspace={handleAddWorkspace}
        onArchiveSession={handleArchiveSession}
        onChangeColor={handleChangeWorkspaceColor}
        onCloseWorkspace={handleCloseWorkspace}
        onCreateSession={handleCreateSession}
        onRenameWorkspace={handleRenameWorkspace}
        onSelectSession={setFocusedSessionId}
        onSelectWorkspace={setSelectedWorkspaceId}
      />

      <section className="board-surface">
        <header className="board-header">
          <div>
            <p className="eyebrow">
              <Layers3 size={14} aria-hidden />
              {selectedWorkspace ? selectedWorkspace.name : "All workspaces"}
            </p>
            <h1>Terminal Board</h1>
          </div>
          <div className="board-actions">
            <button className="primary-button" type="button" onClick={handleAddWorkspace}>
              <FolderPlus size={18} aria-hidden />
              Workspace
            </button>
          </div>
        </header>

        {error ? <div className="error-strip">{error}</div> : null}

        {isLoading ? (
          <div className="empty-state">
            <Activity size={24} aria-hidden />
            Loading terminal board
          </div>
        ) : openWorkspaces.length === 0 ? (
          <div className="empty-state">
            <FolderPlus size={28} aria-hidden />
            <h2>Add a workspace to start</h2>
            <button className="primary-button" type="button" onClick={handleAddWorkspace}>
              Choose folder
            </button>
          </div>
        ) : (
          <TileBoard
            sessions={sessions}
            selectedWorkspaceId={selectedWorkspaceId}
            workspaces={openWorkspaces}
            onArchive={handleArchiveSession}
            onCreateSession={handleCreateSession}
            onFocus={setFocusedSessionId}
            onRestart={handleRestartSession}
            onStop={handleStopSession}
            onWrite={handleWriteToSession}
          />
        )}
      </section>
    </main>
  );
}

async function workspaceListSafe(): Promise<Workspace[]> {
  return workspaceList();
}

function applyOutputEvent(
  event: SessionOutputEvent,
  setSessions: Dispatch<SetStateAction<SessionView[]>>,
) {
  setSessions((current) =>
    current.map((session) => {
      if (session.id !== event.sessionId) {
        return session;
      }
      return {
        ...session,
        outputTail: trimTail(`${session.outputTail}${event.data}`),
        hasProcess: true,
        lastActiveAt: Date.now(),
        status: session.status === "starting" ? "running" : session.status,
      };
    }),
  );
}

function applyStatusEvent(
  event: SessionStatusEvent,
  setSessions: Dispatch<SetStateAction<SessionView[]>>,
) {
  setSessions((current) =>
    current.map((session) => {
      if (session.id !== event.sessionId) {
        return session;
      }
      return {
        ...session,
        status: event.status,
        exitCode: event.exitCode,
        hasProcess: event.status === "running" || event.status === "waiting",
        lastActiveAt: Date.now(),
      };
    }),
  );
}

function trimTail(value: string): string {
  return value.length > 24_000 ? value.slice(value.length - 24_000) : value;
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index === -1) {
    return [item, ...items];
  }
  return items.map((candidate) => (candidate.id === item.id ? item : candidate));
}

function errorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : String(caught);
}
