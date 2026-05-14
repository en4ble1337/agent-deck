import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Activity, Archive, BarChart3, Check, Filter, FolderPlus, Layers3, ListPlus } from "lucide-react";
import type { CommandPreset } from "@/domain/presets";
import type {
  SessionKind,
  SessionOutputEvent,
  SessionStatusEvent,
  SessionView,
} from "@/domain/sessions";
import type { BoardThemeId } from "@/domain/themes";
import type { Workspace } from "@/domain/workspaces";
import workspaceDeckLogo from "@/assets/workspace-deck-logo.png";
import BoardUtilityPanel, {
  type BoardUtilityPanelId,
} from "@/features/board-utility/BoardUtilityPanel";
import FocusedSessionView from "@/features/focused-session/FocusedSessionView";
import TileBoard from "@/features/tile-board/TileBoard";
import WorkspaceSidebar from "@/features/workspace-sidebar/WorkspaceSidebar";
import {
  presetList,
  sessionArchive,
  sessionCreate,
  sessionDelete,
  sessionList,
  sessionRestart,
  sessionStart,
  sessionStop,
  sessionUnarchive,
  sessionWrite,
  workspaceAdd,
  workspaceClose,
  workspaceList,
  workspaceUpdate,
} from "@/services/ipc";
import { readMinimizedSessionIds, writeMinimizedSessionIds } from "@/services/boardStorage";
import { onSessionOutput, onSessionStatus } from "@/services/events";
import { isTauriRuntime } from "@/services/runtime";
import { readStoredBoardThemeId, writeStoredBoardThemeId } from "@/services/themeStorage";

const DEFAULT_COLS = 100;
const DEFAULT_ROWS = 30;
const MANY_SESSION_LIMIT = 12;

export default function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [presets, setPresets] = useState<CommandPreset[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const [themeId, setThemeId] = useState<BoardThemeId>(() => readStoredBoardThemeId());
  const [isWorkspaceFilterOpen, setIsWorkspaceFilterOpen] = useState(false);
  const [activeUtilityPanel, setActiveUtilityPanel] = useState<BoardUtilityPanelId | null>(null);
  const [minimizedSessionIds, setMinimizedSessionIds] = useState<Set<string>>(() =>
    readMinimizedSessionIds(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [nextWorkspaces, nextSessions, nextPresets] = await Promise.all([
      workspaceListSafe(),
      sessionList(undefined, true),
      presetList(),
    ]);
    setWorkspaces(nextWorkspaces);
    setSessions(nextSessions);
    setPresets(nextPresets);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch((caught: unknown) => {
      setError(errorMessage(caught));
      setIsLoading(false);
    });
  }, [refresh]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
    writeStoredBoardThemeId(themeId);
  }, [themeId]);

  useEffect(() => {
    writeMinimizedSessionIds(minimizedSessionIds);
  }, [minimizedSessionIds]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    const visibleSessionIds = new Set(
      sessions.filter((session) => !session.isArchived).map((session) => session.id),
    );
    setMinimizedSessionIds((current) => pruneSessionIds(current, visibleSessionIds));
  }, [isLoading, sessions]);

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
  const openWorkspaceIds = useMemo(
    () => new Set(openWorkspaces.map((workspace) => workspace.id)),
    [openWorkspaces],
  );
  const openWorkspaceSessions = useMemo(
    () => sessions.filter((session) => openWorkspaceIds.has(session.workspaceId)),
    [openWorkspaceIds, sessions],
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
  const boardSessionCount = useMemo(
    () =>
      countBoardSessions(openWorkspaceSessions, selectedWorkspaceId, minimizedSessionIds, {
        minimized: false,
      }),
    [minimizedSessionIds, openWorkspaceSessions, selectedWorkspaceId],
  );
  const minimizedBoardSessionCount = useMemo(
    () =>
      countBoardSessions(openWorkspaceSessions, selectedWorkspaceId, minimizedSessionIds, {
        minimized: true,
      }),
    [minimizedSessionIds, openWorkspaceSessions, selectedWorkspaceId],
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
    setIsWorkspaceFilterOpen(false);
    runAction(async () => {
      const selected = isTauriRuntime()
        ? await open({
            directory: true,
            multiple: false,
            title: "Add workspace",
          })
        : window.prompt("Workspace path", "Projects/new-workspace");
      if (typeof selected !== "string") {
        return;
      }
      const workspace = await workspaceAdd(selected);
      setWorkspaces((current) => upsertById(current, workspace));
      setSelectedWorkspaceId(workspace.id);
    });
  }, [runAction]);

  const handleSelectWorkspaceFilter = useCallback((workspaceId: string | null) => {
    setSelectedWorkspaceId(workspaceId);
    setIsWorkspaceFilterOpen(false);
  }, []);

  const handleToggleUtilityPanel = useCallback((panel: BoardUtilityPanelId) => {
    setIsWorkspaceFilterOpen(false);
    setActiveUtilityPanel((current) => (current === panel ? null : panel));
  }, []);

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
    (workspace: Workspace, accent: string) => {
      runAction(async () => {
        const updated = await workspaceUpdate(workspace.id, { accent });
        setWorkspaces((current) => upsertById(current, updated));
      });
    },
    [runAction],
  );

  const handleCloseWorkspace = useCallback(
    (workspace: Workspace) => {
      const shouldClose = window.confirm(
        `Close workspace "${workspace.name}"?\n\nLive sessions in this workspace will stop. Session history stays saved.`,
      );
      if (!shouldClose) {
        return;
      }
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
        setMinimizedSessionIds((current) => removeSessionId(current, started.id));
        setSessions((current) => upsertById(current, started));
      });
    },
    [runAction],
  );

  const handleCreateManySessions = useCallback(
    (workspaceId: string, kind: SessionKind, count: number) => {
      runAction(async () => {
        const boundedCount = Math.min(MANY_SESSION_LIMIT, Math.max(1, count));
        const startedSessions: SessionView[] = [];
        for (let index = 0; index < boundedCount; index += 1) {
          const created = await sessionCreate({ workspaceId, kind });
          setSessions((current) => upsertById(current, created));
          const started = await sessionStart(created.id, DEFAULT_COLS, DEFAULT_ROWS);
          startedSessions.push(started);
          setSessions((current) => upsertById(current, started));
        }
        setMinimizedSessionIds((current) =>
          removeSessionIds(
            current,
            startedSessions.map((session) => session.id),
          ),
        );
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

  const handleEnsureSessionRunning = useCallback(async (sessionId: string) => {
    setError(null);
    const started = await sessionStart(sessionId, DEFAULT_COLS, DEFAULT_ROWS);
    setMinimizedSessionIds((current) => removeSessionId(current, started.id));
    setSessions((current) => upsertById(current, started));
    return started;
  }, []);

  const handleWriteToSession = useCallback(async (sessionId: string, data: string) => {
    setError(null);
    await sessionWrite(sessionId, data);
  }, []);

  const handleArchiveSession = useCallback(
    (sessionId: string) => {
      runAction(async () => {
        const archived = await sessionArchive(sessionId);
        setMinimizedSessionIds((current) => removeSessionId(current, sessionId));
        setSessions((current) => upsertById(current, archived));
        if (focusedSessionId === sessionId) {
          setFocusedSessionId(null);
        }
      });
    },
    [focusedSessionId, runAction],
  );

  const handleUnarchiveSession = useCallback(
    (sessionId: string) => {
      runAction(async () => {
        const restored = await sessionUnarchive(sessionId);
        setSessions((current) => upsertById(current, restored));
      });
    },
    [runAction],
  );

  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      if (!window.confirm("Delete this session and transcript?")) {
        return;
      }
      runAction(async () => {
        await sessionDelete(sessionId, true);
        setMinimizedSessionIds((current) => removeSessionId(current, sessionId));
        setSessions((current) => current.filter((session) => session.id !== sessionId));
        if (focusedSessionId === sessionId) {
          setFocusedSessionId(null);
        }
      });
    },
    [focusedSessionId, runAction],
  );

  const handleMinimizeSession = useCallback((sessionId: string) => {
    setMinimizedSessionIds((current) => addSessionId(current, sessionId));
  }, []);

  const handleRestoreSession = useCallback((sessionId: string) => {
    setMinimizedSessionIds((current) => removeSessionId(current, sessionId));
  }, []);

  const handleRestoreVisibleSessions = useCallback(() => {
    setMinimizedSessionIds((current) => {
      const visibleSessionIds = openWorkspaceSessions
        .filter((session) => !session.isArchived)
        .filter((session) => !selectedWorkspaceId || session.workspaceId === selectedWorkspaceId)
        .map((session) => session.id);
      return removeSessionIds(current, visibleSessionIds);
    });
  }, [openWorkspaceSessions, selectedWorkspaceId]);

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
        sessions={openWorkspaceSessions}
        workspaces={openWorkspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        minimizedSessionIds={minimizedSessionIds}
        onAddWorkspace={handleAddWorkspace}
        onArchiveSession={handleArchiveSession}
        onChangeColor={handleChangeWorkspaceColor}
        onCloseWorkspace={handleCloseWorkspace}
        onCreateManySessions={handleCreateManySessions}
        onCreateSession={handleCreateSession}
        onRenameWorkspace={handleRenameWorkspace}
        onRestoreSession={handleRestoreSession}
        onSelectSession={setFocusedSessionId}
        onSelectWorkspace={setSelectedWorkspaceId}
        onChangeTheme={setThemeId}
        themeId={themeId}
      />

      <section className="board-surface">
        <header className="board-header">
          <div className="board-heading">
            <img className="board-logo" src={workspaceDeckLogo} alt="" aria-hidden />
            <div className="board-heading-copy">
              <p className="eyebrow">
                <Layers3 size={14} aria-hidden />
                {selectedWorkspace ? selectedWorkspace.name : "All workspaces"}
              </p>
              <div className="board-title-row">
                <h1>Board</h1>
                <span className="board-count-pill">{boardSessionCount} on board</span>
                {minimizedBoardSessionCount > 0 ? (
                  <span className="board-count-pill">{minimizedBoardSessionCount} minimized</span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="board-actions">
            <button
              className={`secondary-button utility-trigger ${
                activeUtilityPanel === "activity" ? "is-active" : ""
              }`}
              type="button"
              onClick={() => handleToggleUtilityPanel("activity")}
            >
              <BarChart3 size={16} aria-hidden />
              Activity
            </button>
            <button
              className={`secondary-button utility-trigger ${
                activeUtilityPanel === "presets" ? "is-active" : ""
              }`}
              type="button"
              onClick={() => handleToggleUtilityPanel("presets")}
            >
              <ListPlus size={16} aria-hidden />
              Presets
            </button>
            <button
              className={`secondary-button utility-trigger ${
                activeUtilityPanel === "archive" ? "is-active" : ""
              }`}
              type="button"
              onClick={() => handleToggleUtilityPanel("archive")}
            >
              <Archive size={16} aria-hidden />
              Archive
            </button>
            <div className="workspace-filter-control">
              <button
                aria-expanded={isWorkspaceFilterOpen}
                className={`secondary-button workspace-filter-trigger ${
                  isWorkspaceFilterOpen ? "is-active" : ""
                }`}
                type="button"
                onClick={() => setIsWorkspaceFilterOpen((current) => !current)}
              >
                <Filter size={16} aria-hidden />
                Filter
              </button>
              {isWorkspaceFilterOpen ? (
                <div className="workspace-filter-menu" role="listbox" aria-label="Workspace filter">
                  <button
                    aria-selected={selectedWorkspaceId === null}
                    className="workspace-filter-option"
                    role="option"
                    type="button"
                    onClick={() => handleSelectWorkspaceFilter(null)}
                  >
                    <span className="workspace-filter-all-dot" aria-hidden />
                    <span>
                      <strong>All workspaces</strong>
                      <small>{countBoardSessions(openWorkspaceSessions, null, minimizedSessionIds, { minimized: false })} on board</small>
                    </span>
                    {selectedWorkspaceId === null ? <Check size={15} aria-hidden /> : null}
                  </button>
                  {openWorkspaces.map((workspace) => {
                    const count = countBoardSessions(openWorkspaceSessions, workspace.id, minimizedSessionIds, {
                      minimized: false,
                    });
                    return (
                      <button
                        aria-selected={selectedWorkspaceId === workspace.id}
                        className="workspace-filter-option"
                        key={workspace.id}
                        role="option"
                        style={{ "--workspace-accent": workspace.accent } as CSSProperties}
                        type="button"
                        onClick={() => handleSelectWorkspaceFilter(workspace.id)}
                      >
                        <span className="accent-dot" aria-hidden />
                        <span>
                          <strong>{workspace.name}</strong>
                          <small>{count} on board</small>
                        </span>
                        {selectedWorkspaceId === workspace.id ? <Check size={15} aria-hidden /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <button className="primary-button" type="button" onClick={handleAddWorkspace}>
              <FolderPlus size={18} aria-hidden />
              Workspace
            </button>
          </div>
        </header>

        {error ? <div className="error-strip">{error}</div> : null}

        {activeUtilityPanel ? (
          <BoardUtilityPanel
            panel={activeUtilityPanel}
            presets={presets}
            selectedWorkspaceId={selectedWorkspaceId}
            sessions={openWorkspaceSessions}
            workspaces={openWorkspaces}
            onClose={() => setActiveUtilityPanel(null)}
            onCreateSession={handleCreateSession}
            onDeleteSession={handleDeleteSession}
            onFocusSession={setFocusedSessionId}
            onRestoreSession={handleUnarchiveSession}
          />
        ) : null}

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
            sessions={openWorkspaceSessions}
            selectedWorkspaceId={selectedWorkspaceId}
            workspaces={openWorkspaces}
            minimizedSessionIds={minimizedSessionIds}
            onArchive={handleArchiveSession}
            onCreateSession={handleCreateSession}
            onEnsureRunning={handleEnsureSessionRunning}
            onFocus={setFocusedSessionId}
            onMinimize={handleMinimizeSession}
            onRestart={handleRestartSession}
            onRestoreAll={handleRestoreVisibleSessions}
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

function addSessionId(sessionIds: Set<string>, sessionId: string): Set<string> {
  if (sessionIds.has(sessionId)) {
    return sessionIds;
  }
  return new Set([...sessionIds, sessionId]);
}

function removeSessionId(sessionIds: Set<string>, sessionId: string): Set<string> {
  if (!sessionIds.has(sessionId)) {
    return sessionIds;
  }
  const next = new Set(sessionIds);
  next.delete(sessionId);
  return next;
}

function removeSessionIds(sessionIds: Set<string>, idsToRemove: string[]): Set<string> {
  let changed = false;
  const next = new Set(sessionIds);
  for (const id of idsToRemove) {
    changed = next.delete(id) || changed;
  }
  return changed ? next : sessionIds;
}

function pruneSessionIds(
  sessionIds: Set<string>,
  allowedSessionIds: Set<string>,
): Set<string> {
  const next = new Set<string>();
  let changed = false;
  for (const id of sessionIds) {
    if (allowedSessionIds.has(id)) {
      next.add(id);
    } else {
      changed = true;
    }
  }
  return changed ? next : sessionIds;
}

function countBoardSessions(
  sessions: SessionView[],
  selectedWorkspaceId: string | null,
  minimizedSessionIds: ReadonlySet<string>,
  options: { minimized: boolean },
): number {
  return sessions
    .filter((session) => !session.isArchived)
    .filter((session) => !selectedWorkspaceId || session.workspaceId === selectedWorkspaceId)
    .filter((session) => minimizedSessionIds.has(session.id) === options.minimized)
    .length;
}

function errorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : String(caught);
}
