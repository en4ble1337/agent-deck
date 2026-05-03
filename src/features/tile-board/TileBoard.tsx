import { Archive, Maximize2, Play, RotateCcw, Square, Terminal } from "lucide-react";
import type { CSSProperties } from "react";
import type { SessionKind, SessionView } from "@/domain/sessions";
import type { Workspace } from "@/domain/workspaces";
import { formatShortTime } from "@/utils/time";

type Props = {
  sessions: SessionView[];
  selectedWorkspaceId: string | null;
  workspaces: Workspace[];
  onArchive: (sessionId: string) => void;
  onCreateSession: (workspaceId: string, kind: SessionKind) => void;
  onFocus: (sessionId: string) => void;
  onRestart: (sessionId: string) => void;
  onStop: (sessionId: string) => void;
};

export default function TileBoard({
  sessions,
  selectedWorkspaceId,
  workspaces,
  onArchive,
  onCreateSession,
  onFocus,
  onRestart,
  onStop,
}: Props) {
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
  const visibleSessions = sessions
    .filter((session) => !session.isArchived)
    .filter((session) => !selectedWorkspaceId || session.workspaceId === selectedWorkspaceId)
    .sort(compareSessions);
  const selectedWorkspace =
    selectedWorkspaceId ? workspaceById.get(selectedWorkspaceId) ?? null : null;

  if (visibleSessions.length === 0) {
    return (
      <div className="empty-state">
        <Terminal size={28} aria-hidden />
        <h2>No sessions on the board</h2>
        {selectedWorkspace ? (
          <button
            className="primary-button"
            type="button"
            onClick={() => onCreateSession(selectedWorkspace.id, "terminal")}
          >
            Start terminal
          </button>
        ) : (
          <p>Select a workspace and start a real terminal session.</p>
        )}
      </div>
    );
  }

  return (
    <div className="tile-grid">
      {visibleSessions.map((session) => {
        const workspace = workspaceById.get(session.workspaceId);
        return (
          <article
            className={`session-tile tile-${session.tileSize}`}
            key={session.id}
            style={{ "--workspace-accent": workspace?.accent ?? "#48d597" } as CSSProperties}
          >
            <header className="tile-header">
              <button className="tile-title" type="button" onClick={() => onFocus(session.id)}>
                <span className={`status-dot status-${session.status}`} />
                <span>
                  <strong>{session.title}</strong>
                  <small>{workspace?.name ?? "Workspace"}</small>
                </span>
              </button>
              <div className="tile-actions">
                <button className="icon-button" type="button" onClick={() => onFocus(session.id)} title="Focus">
                  <Maximize2 size={15} aria-hidden />
                </button>
                {session.hasProcess ? (
                  <button className="icon-button" type="button" onClick={() => onStop(session.id)} title="Stop">
                    <Square size={15} aria-hidden />
                  </button>
                ) : (
                  <button className="icon-button" type="button" onClick={() => onRestart(session.id)} title="Start">
                    <Play size={15} aria-hidden />
                  </button>
                )}
                <button className="icon-button" type="button" onClick={() => onRestart(session.id)} title="Restart">
                  <RotateCcw size={15} aria-hidden />
                </button>
                <button className="icon-button" type="button" onClick={() => onArchive(session.id)} title="Archive">
                  <Archive size={15} aria-hidden />
                </button>
              </div>
            </header>
            <div className="tile-meta">
              <span>{session.kind}</span>
              <span>{session.status}</span>
              <span>{formatShortTime(session.lastActiveAt)}</span>
            </div>
            <button className="terminal-tail" type="button" onClick={() => onFocus(session.id)}>
              <pre>{session.outputTail}</pre>
            </button>
          </article>
        );
      })}
    </div>
  );
}

function compareSessions(left: SessionView, right: SessionView): number {
  const liveDelta = Number(right.hasProcess) - Number(left.hasProcess);
  if (liveDelta !== 0) {
    return liveDelta;
  }
  const pinnedDelta = Number(right.isPinned) - Number(left.isPinned);
  if (pinnedDelta !== 0) {
    return pinnedDelta;
  }
  return right.lastActiveAt - left.lastActiveAt;
}
