import { useMemo, useState, type CSSProperties } from "react";
import {
  Archive,
  Bot,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  FolderPlus,
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

type Props = {
  workspaces: Workspace[];
  sessions: SessionView[];
  selectedWorkspaceId: string | null;
  onAddWorkspace: () => void;
  onArchiveSession: (sessionId: string) => void;
  onChangeColor: (workspace: Workspace, accent: string) => void;
  onChangeTheme: (themeId: BoardThemeId) => void;
  onCloseWorkspace: (workspace: Workspace) => void;
  onCreateSession: (workspaceId: string, kind: SessionKind) => void;
  onRenameWorkspace: (workspace: Workspace) => void;
  onSelectSession: (sessionId: string) => void;
  onSelectWorkspace: (workspaceId: string | null) => void;
  themeId: BoardThemeId;
};

export default function WorkspaceSidebar({
  workspaces,
  sessions,
  selectedWorkspaceId,
  onAddWorkspace,
  onArchiveSession,
  onChangeColor,
  onChangeTheme,
  onCloseWorkspace,
  onCreateSession,
  onRenameWorkspace,
  onSelectSession,
  onSelectWorkspace,
  themeId,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [colorMenuWorkspaceId, setColorMenuWorkspaceId] = useState<string | null>(null);
  const [newSessionMenuWorkspaceId, setNewSessionMenuWorkspaceId] = useState<string | null>(null);
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
          <span className="app-mark">TB</span>
          <strong>Terminal Board</strong>
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
                    type="button"
                    onClick={() => {
                      onCreateSession(workspace.id, "custom");
                      setNewSessionMenuWorkspaceId(null);
                    }}
                  >
                    Custom
                  </button>
                </div>
              ) : null}

              {isExpanded ? (
                <div className="session-list">
                  {visibleSessions.map((session) => {
                    const signal = sessionSignal(session);
                    return (
                      <div
                        className={`session-row signal-${signal}`}
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
                            </small>
                          </span>
                        </button>
                        <button
                          className="icon-button subtle"
                          type="button"
                          onClick={() => onArchiveSession(session.id)}
                          title="Archive session"
                        >
                          <Archive size={14} aria-hidden />
                        </button>
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
          <div className="theme-picker-title">
            <Palette size={14} aria-hidden />
            Theme
          </div>
          <div className="theme-options" role="listbox" aria-label="Theme">
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
                onClick={() => onChangeTheme(theme.id)}
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
        </div>
      </footer>
    </aside>
  );
}
