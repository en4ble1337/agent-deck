import { useMemo, useState, type CSSProperties } from "react";
import {
  Archive,
  Bot,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  Cloud,
  FolderPlus,
  Maximize2,
  Paintbrush,
  Palette,
  Pencil,
  Terminal,
  X,
} from "lucide-react";
import type { SessionKind, SessionView } from "@/domain/sessions";
import { BOARD_THEMES, type BoardThemeId } from "@/domain/themes";
import { WORKSPACE_ACCENTS, type Workspace } from "@/domain/workspaces";
import { sessionSignal, sessionSignalLabel } from "@/utils/terminalText";
import { compactPath, formatShortTime } from "@/utils/time";

type BatchSessionKind = Extract<SessionKind, "terminal" | "codex" | "claude">;

const BATCH_SESSION_LIMIT = 12;
const BATCH_SESSION_KINDS: Array<{
  icon: "bot" | "cloud" | "terminal";
  kind: BatchSessionKind;
  label: string;
}> = [
  { icon: "terminal", kind: "terminal", label: "Terminal" },
  { icon: "bot", kind: "codex", label: "Codex" },
  { icon: "cloud", kind: "claude", label: "Claude" },
];

type Props = {
  workspaces: Workspace[];
  sessions: SessionView[];
  selectedWorkspaceId: string | null;
  minimizedSessionIds: ReadonlySet<string>;
  onAddWorkspace: () => void;
  onArchiveSession: (sessionId: string) => void;
  onChangeColor: (workspace: Workspace, accent: string) => void;
  onChangeTheme: (themeId: BoardThemeId) => void;
  onCloseWorkspace: (workspace: Workspace) => void;
  onCreateManySessions: (workspaceId: string, kind: BatchSessionKind, count: number) => void;
  onCreateSession: (workspaceId: string, kind: SessionKind) => void;
  onRenameWorkspace: (workspace: Workspace) => void;
  onRestoreSession: (sessionId: string) => void;
  onSelectSession: (sessionId: string) => void;
  onSelectWorkspace: (workspaceId: string | null) => void;
  themeId: BoardThemeId;
};

export default function WorkspaceSidebar({
  workspaces,
  sessions,
  selectedWorkspaceId,
  minimizedSessionIds,
  onAddWorkspace,
  onArchiveSession,
  onChangeColor,
  onChangeTheme,
  onCloseWorkspace,
  onCreateManySessions,
  onCreateSession,
  onRenameWorkspace,
  onRestoreSession,
  onSelectSession,
  onSelectWorkspace,
  themeId,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [colorMenuWorkspaceId, setColorMenuWorkspaceId] = useState<string | null>(null);
  const [newSessionMenuWorkspaceId, setNewSessionMenuWorkspaceId] = useState<string | null>(null);
  const [batchPanelWorkspaceId, setBatchPanelWorkspaceId] = useState<string | null>(null);
  const [batchSessionKind, setBatchSessionKind] = useState<BatchSessionKind>("terminal");
  const [batchSessionCount, setBatchSessionCount] = useState(2);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [showMore, setShowMore] = useState<Record<string, boolean>>({});
  const sessionsByWorkspace = useMemo(() => {
    const map = new Map<string, SessionView[]>();
    for (const session of sessions) {
      if (session.isArchived) {
        continue;
      }
      const group = map.get(session.workspaceId) ?? [];
      group.push(session);
      map.set(session.workspaceId, group);
    }
    for (const group of map.values()) {
      group.sort((left, right) => right.lastActiveAt - left.lastActiveAt);
    }
    return map;
  }, [sessions]);

  return (
    <aside className="workspace-sidebar">
      <div className="sidebar-title">
        <div>
          <span className="app-mark">WD</span>
          <strong>Workspace Deck</strong>
        </div>
        <button className="icon-button" type="button" onClick={onAddWorkspace} title="Add workspace">
          <FolderPlus size={18} aria-hidden />
        </button>
      </div>

      <button
        className={`all-workspaces ${selectedWorkspaceId === null ? "is-active" : ""}`}
        type="button"
        onClick={() => onSelectWorkspace(null)}
      >
        All workspaces
      </button>

      <div className="workspace-list">
        {workspaces.map((workspace) => {
          const workspaceSessions = sessionsByWorkspace.get(workspace.id) ?? [];
          const isExpanded = expanded[workspace.id] ?? true;
          const visibleCount = showMore[workspace.id] ? workspaceSessions.length : 5;
          const visibleSessions = workspaceSessions.slice(0, visibleCount);
          const liveCount = workspaceSessions.filter((session) => session.hasProcess).length;

          return (
            <section className="workspace-group" key={workspace.id}>
              <div
                className={`workspace-row ${
                  selectedWorkspaceId === workspace.id ? "is-selected" : ""
                }`}
                style={{ "--workspace-accent": workspace.accent } as CSSProperties}
              >
                <button
                  className="disclosure-button"
                  type="button"
                  onClick={() =>
                    setExpanded((current) => ({
                      ...current,
                      [workspace.id]: !isExpanded,
                    }))
                  }
                  title={isExpanded ? "Collapse sessions" : "Expand sessions"}
                >
                  {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
                <button
                  className="workspace-main"
                  type="button"
                  onClick={() => onSelectWorkspace(workspace.id)}
                  title={workspace.path}
                >
                  <span className="accent-dot" />
                  <span>
                    <strong>{workspace.name}</strong>
                    <small>{compactPath(workspace.path)}</small>
                  </span>
                </button>
                <span className="live-count" title="Live sessions">
                  {liveCount}
                </span>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => {
                    setColorMenuWorkspaceId(null);
                    setIsThemeMenuOpen(false);
                    setBatchPanelWorkspaceId(null);
                    setBatchSessionKind("terminal");
                    setBatchSessionCount(2);
                    setNewSessionMenuWorkspaceId((current) =>
                      current === workspace.id ? null : workspace.id,
                    );
                  }}
                  title="New session"
                >
                  <CirclePlus size={17} aria-hidden />
                </button>
              </div>

              {newSessionMenuWorkspaceId === workspace.id ? (
                <div className="new-session-menu" role="menu">
                  <button
                    type="button"
                    onClick={() => {
                      onCreateSession(workspace.id, "terminal");
                      setNewSessionMenuWorkspaceId(null);
                    }}
                  >
                    <Terminal size={14} aria-hidden />
                    Terminal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCreateSession(workspace.id, "codex");
                      setNewSessionMenuWorkspaceId(null);
                    }}
                  >
                    <Bot size={14} aria-hidden />
                    Codex
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCreateSession(workspace.id, "claude");
                      setNewSessionMenuWorkspaceId(null);
                    }}
                  >
                    Claude
                  </button>
                  <button
                    aria-expanded={batchPanelWorkspaceId === workspace.id}
                    type="button"
                    onClick={() => {
                      const willOpen = batchPanelWorkspaceId !== workspace.id;
                      if (willOpen) {
                        setBatchSessionKind("terminal");
                        setBatchSessionCount(2);
                      }
                      setBatchPanelWorkspaceId(willOpen ? workspace.id : null);
                    }}
                  >
                    <CirclePlus size={14} aria-hidden />
                    Many terminals
                  </button>
                  {batchPanelWorkspaceId === workspace.id ? (
                    <div className="many-session-panel">
                      <div className="many-session-kinds" role="radiogroup" aria-label="Session type">
                        {BATCH_SESSION_KINDS.map((option) => (
                          <button
                            aria-checked={batchSessionKind === option.kind}
                            className={batchSessionKind === option.kind ? "is-selected" : ""}
                            key={option.kind}
                            role="radio"
                            type="button"
                            onClick={() => setBatchSessionKind(option.kind)}
                          >
                            <BatchSessionIcon icon={option.icon} />
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <label className="many-session-count">
                        <span>Windows</span>
                        <input
                          max={BATCH_SESSION_LIMIT}
                          min={1}
                          type="number"
                          value={batchSessionCount}
                          onChange={(event) =>
                            setBatchSessionCount(normalizeBatchCount(event.target.value))
                          }
                        />
                      </label>
                      <button
                        className="many-session-start"
                        type="button"
                        onClick={() => {
                          onCreateManySessions(workspace.id, batchSessionKind, batchSessionCount);
                          setBatchPanelWorkspaceId(null);
                          setNewSessionMenuWorkspaceId(null);
                        }}
                      >
                        Start
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {isExpanded ? (
                <div className="session-list">
                  {visibleSessions.map((session) => {
                    const signal = sessionSignal(session);
                    return (
                      <div
                        className={`session-row signal-${signal} ${
                          minimizedSessionIds.has(session.id) ? "is-minimized" : ""
                        }`}
                        key={session.id}
                        style={{ "--workspace-accent": workspace.accent } as CSSProperties}
                      >
                        <button
                          className="session-main"
                          type="button"
                          onClick={() => onSelectSession(session.id)}
                        >
                          <span className={`status-dot status-${session.status}`} />
                          <span>
                            <strong>{session.title}</strong>
                            <small>
                              {session.kind} - {sessionSignalLabel(signal)} -{" "}
                              {formatShortTime(session.lastActiveAt)}
                              {minimizedSessionIds.has(session.id) ? " - minimized" : ""}
                            </small>
                          </span>
                        </button>
                        <div className="session-row-actions">
                          {minimizedSessionIds.has(session.id) ? (
                            <button
                              className="icon-button subtle"
                              type="button"
                              onClick={() => onRestoreSession(session.id)}
                              title="Show on board"
                            >
                              <Maximize2 size={14} aria-hidden />
                            </button>
                          ) : null}
                          <button
                            className="icon-button subtle"
                            type="button"
                            onClick={() => onArchiveSession(session.id)}
                            title="Archive session"
                          >
                            <Archive size={14} aria-hidden />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {workspaceSessions.length > 5 ? (
                    <button
                      className="show-more-button"
                      type="button"
                      onClick={() =>
                        setShowMore((current) => ({
                          ...current,
                          [workspace.id]: !current[workspace.id],
                        }))
                      }
                    >
                      {showMore[workspace.id] ? "Show less" : `Show ${workspaceSessions.length - 5} more`}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="workspace-admin">
                <button type="button" onClick={() => onRenameWorkspace(workspace)}>
                  <Pencil size={13} aria-hidden />
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewSessionMenuWorkspaceId(null);
                    setIsThemeMenuOpen(false);
                    setBatchPanelWorkspaceId(null);
                    setColorMenuWorkspaceId((current) =>
                      current === workspace.id ? null : workspace.id,
                    );
                  }}
                >
                  <Paintbrush size={13} aria-hidden />
                  Color
                </button>
                <button type="button" onClick={() => onCloseWorkspace(workspace)}>
                  <X size={13} aria-hidden />
                  Close
                </button>
              </div>

              {colorMenuWorkspaceId === workspace.id ? (
                <div className="workspace-color-menu" role="listbox" aria-label="Workspace color">
                  {WORKSPACE_ACCENTS.map((accent) => (
                    <button
                      aria-label={accent.name}
                      aria-selected={workspace.accent === accent.value}
                      className={workspace.accent === accent.value ? "is-selected" : ""}
                      key={accent.value}
                      role="option"
                      style={{ "--swatch-color": accent.value } as CSSProperties}
                      title={accent.name}
                      type="button"
                      onClick={() => {
                        onChangeColor(workspace, accent.value);
                        setColorMenuWorkspaceId(null);
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <footer className="sidebar-footer">
        <div className="theme-picker">
          <button
            aria-expanded={isThemeMenuOpen}
            aria-label="Theme"
            className={`theme-trigger ${isThemeMenuOpen ? "is-active" : ""}`}
            title="Theme"
            type="button"
            onClick={() => {
              setColorMenuWorkspaceId(null);
              setNewSessionMenuWorkspaceId(null);
              setBatchPanelWorkspaceId(null);
              setIsThemeMenuOpen((current) => !current);
            }}
          >
            <Palette size={17} aria-hidden />
          </button>

          {isThemeMenuOpen ? (
            <div className="theme-menu" role="listbox" aria-label="Theme">
              {BOARD_THEMES.map((theme) => (
                <button
                  aria-label={`${theme.name} theme`}
                  aria-selected={themeId === theme.id}
                  className={`theme-option ${themeId === theme.id ? "is-selected" : ""}`}
                  key={theme.id}
                  role="option"
                  style={
                    {
                      "--theme-bg": theme.swatches[0],
                      "--theme-surface": theme.swatches[1],
                      "--theme-accent": theme.swatches[2],
                    } as CSSProperties
                  }
                  title={`${theme.name} theme`}
                  type="button"
                  onClick={() => {
                    onChangeTheme(theme.id);
                    setIsThemeMenuOpen(false);
                  }}
                >
                  <span className="theme-swatch" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </span>
                  <span>{theme.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </footer>
    </aside>
  );
}

function BatchSessionIcon({ icon }: { icon: "bot" | "cloud" | "terminal" }) {
  switch (icon) {
    case "bot":
      return <Bot size={13} aria-hidden />;
    case "cloud":
      return <Cloud size={13} aria-hidden />;
    case "terminal":
      return <Terminal size={13} aria-hidden />;
  }
}

function normalizeBatchCount(value: string): number {
  const count = Number.parseInt(value, 10);
  if (!Number.isFinite(count)) {
    return 1;
  }
  return Math.min(BATCH_SESSION_LIMIT, Math.max(1, count));
}
