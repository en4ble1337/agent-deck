import { Archive, Maximize2, Play, RotateCcw, SendHorizontal, Square, Terminal } from "lucide-react";
import { useState, type CSSProperties, type KeyboardEvent } from "react";
import type { SessionKind, SessionView } from "@/domain/sessions";
import type { Workspace } from "@/domain/workspaces";
import {
  sessionSignal,
  sessionSignalLabel,
  terminalPreviewText,
} from "@/utils/terminalText";
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
  onWrite: (sessionId: string, data: string) => void;
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
  onWrite,
}: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
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
        const preview = terminalPreviewText(session.outputTail);
        const signal = sessionSignal(session);
        const signalLabel = sessionSignalLabel(signal);
        const draft = drafts[session.id] ?? "";
        return (
          <article
            className={`session-tile tile-${session.tileSize} signal-${signal}`}
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
              <span className={`signal-pill signal-${signal}`}>{signalLabel}</span>
              <span>{formatShortTime(session.lastActiveAt)}</span>
            </div>
            <button className="terminal-tail" type="button" onClick={() => onFocus(session.id)}>
              <pre>{preview || "Session is ready. Type below or open the full terminal."}</pre>
            </button>
            <form
              className="quick-input-form"
              onSubmit={(event) => {
                event.preventDefault();
                sendQuickInput(session.id, draft, setDrafts, onWrite);
              }}
            >
              <input
                aria-label={`Type into ${session.title}`}
                disabled={!session.hasProcess}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [session.id]: event.target.value,
                  }))
                }
                onKeyDown={(event) => {
                  handleQuickInputKeyDown(event, session.id, draft, setDrafts, onWrite);
                }}
                placeholder={
                  session.hasProcess ? "Type command and press Enter" : "Start session to type"
                }
                value={draft}
              />
              <button
                className="quick-send-button"
                disabled={!session.hasProcess || draft.length === 0}
                title="Send to terminal"
                type="submit"
              >
                <SendHorizontal size={15} aria-hidden />
              </button>
            </form>
          </article>
        );
      })}
    </div>
  );
}

function handleQuickInputKeyDown(
  event: KeyboardEvent<HTMLInputElement>,
  sessionId: string,
  draft: string,
  setDrafts: (updater: (current: Record<string, string>) => Record<string, string>) => void,
  onWrite: (sessionId: string, data: string) => void,
) {
  if (event.key !== "Enter") {
    return;
  }
  event.preventDefault();
  sendQuickInput(sessionId, draft, setDrafts, onWrite);
}

function sendQuickInput(
  sessionId: string,
  draft: string,
  setDrafts: (updater: (current: Record<string, string>) => Record<string, string>) => void,
  onWrite: (sessionId: string, data: string) => void,
) {
  if (draft.length === 0) {
    return;
  }
  onWrite(sessionId, `${draft}\r`);
  setDrafts((current) => ({
    ...current,
    [sessionId]: "",
  }));
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
