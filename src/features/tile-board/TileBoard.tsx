import {
  Archive,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  SendHorizontal,
  Square,
  Terminal,
} from "lucide-react";
import { useEffect, useRef, useState, type ClipboardEvent, type CSSProperties } from "react";
import type { SessionAttachment, SessionKind, SessionView } from "@/domain/sessions";
import type { Workspace } from "@/domain/workspaces";
import { sessionSaveAttachment } from "@/services/ipc";
import { isTauriRuntime } from "@/services/runtime";
import {
  sessionSignal,
  sessionSignalLabel,
  terminalPreviewText,
} from "@/utils/terminalText";
import { codexSubmitData } from "@/utils/codexTerminalKeys";
import { formatShortTime } from "@/utils/time";

type Props = {
  sessions: SessionView[];
  selectedWorkspaceId: string | null;
  workspaces: Workspace[];
  minimizedSessionIds: ReadonlySet<string>;
  onArchive: (sessionId: string) => void;
  onCreateSession: (workspaceId: string, kind: SessionKind) => void;
  onFocus: (sessionId: string) => void;
  onMinimize: (sessionId: string) => void;
  onRestart: (sessionId: string) => void;
  onRestoreAll: () => void;
  onStop: (sessionId: string) => void;
  onWrite: (sessionId: string, data: string) => Promise<void>;
};

export default function TileBoard({
  sessions,
  selectedWorkspaceId,
  workspaces,
  minimizedSessionIds,
  onArchive,
  onCreateSession,
  onFocus,
  onMinimize,
  onRestart,
  onRestoreAll,
  onStop,
  onWrite,
}: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pasteNotices, setPasteNotices] = useState<Record<string, string>>({});
  const [sendingSessionIds, setSendingSessionIds] = useState<Record<string, boolean>>({});
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
  const visibleSessions = sessions
    .filter((session) => !session.isArchived)
    .filter((session) => !minimizedSessionIds.has(session.id))
    .filter((session) => !selectedWorkspaceId || session.workspaceId === selectedWorkspaceId)
    .sort(compareSessions);
  const minimizedCount = sessions
    .filter((session) => !session.isArchived)
    .filter((session) => minimizedSessionIds.has(session.id))
    .filter((session) => !selectedWorkspaceId || session.workspaceId === selectedWorkspaceId)
    .length;
  const selectedWorkspace =
    selectedWorkspaceId ? workspaceById.get(selectedWorkspaceId) ?? null : null;

  if (visibleSessions.length === 0) {
    return (
      <div className="empty-state">
        <Terminal size={28} aria-hidden />
        <h2>{minimizedCount > 0 ? "All sessions are minimized" : "No sessions on the board"}</h2>
        {minimizedCount > 0 ? (
          <button className="primary-button" type="button" onClick={onRestoreAll}>
            Restore minimized
          </button>
        ) : selectedWorkspace ? (
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

  const gridDensity = visibleSessions.length > 6 ? "many" : String(visibleSessions.length);

  return (
    <div className={`tile-grid tile-grid-count-${gridDensity}`}>
      {visibleSessions.map((session) => {
        const workspace = workspaceById.get(session.workspaceId);
        const preview = terminalPreviewText(session.outputTail);
        const signal = sessionSignal(session);
        const signalLabel = sessionSignalLabel(signal);
        const draft = drafts[session.id] ?? "";
        const pasteNotice = pasteNotices[session.id] ?? null;
        const isSending = sendingSessionIds[session.id] === true;
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
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => onMinimize(session.id)}
                  title="Minimize to sidebar"
                >
                  <Minimize2 size={15} aria-hidden />
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
              <TerminalPreviewText
                text={preview || "Session is ready. Type below or open the full terminal."}
              />
            </button>
            <form
              className="quick-input-form"
              onSubmit={(event) => {
                event.preventDefault();
                void sendQuickInput(
                  session,
                  draft,
                  setDrafts,
                  setSendingSessionIds,
                  onWrite,
                );
              }}
            >
              <input
                aria-label={`Type into ${session.title}`}
                disabled={!session.hasProcess || isSending}
                onChange={(event) => {
                  setPasteNotices((current) => removeSessionNotice(current, session.id));
                  setDrafts((current) => ({
                    ...current,
                    [session.id]: event.target.value,
                  }));
                }}
                onPaste={(event) => {
                  void handleQuickInputPaste(
                    event,
                    session,
                    setDrafts,
                    setPasteNotices,
                  );
                }}
                placeholder={
                  session.hasProcess ? quickInputPlaceholder(session.kind) : "Start session to type"
                }
                value={draft}
              />
              <button
                className="quick-send-button"
                disabled={!session.hasProcess || isSending || draft.length === 0}
                title="Send to terminal"
                type="submit"
              >
                <SendHorizontal size={15} aria-hidden />
              </button>
              {pasteNotice ? (
                <div className="quick-input-notice" role="status">
                  {pasteNotice}
                </div>
              ) : null}
            </form>
          </article>
        );
      })}
    </div>
  );
}

function TerminalPreviewText({ text }: { text: string }) {
  const previewRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    const preview = previewRef.current;
    if (preview) {
      preview.scrollTop = preview.scrollHeight;
    }
  }, [text]);

  return <pre ref={previewRef}>{text}</pre>;
}

function handleQuickInputPaste(
  event: ClipboardEvent<HTMLInputElement>,
  session: SessionView,
  setDrafts: (updater: (current: Record<string, string>) => Record<string, string>) => void,
  setPasteNotices: (updater: (current: Record<string, string>) => Record<string, string>) => void,
) {
  const image = pastedImageFile(event.clipboardData.items);
  if (!image) {
    return;
  }
  event.preventDefault();
  if (!isTauriRuntime()) {
    showQuickInputNotice(
      session.id,
      "Image paste works in the desktop app so the image can be saved as a local file.",
      setPasteNotices,
    );
    return;
  }

  savePastedImage(session, image)
    .then((attachment) => {
      setDrafts((current) => appendDraftText(current, session.id, attachmentReference(attachment)));
      showQuickInputNotice(session.id, "Image saved and path added.", setPasteNotices);
    })
    .catch((caught: unknown) => {
      showQuickInputNotice(session.id, errorMessage(caught), setPasteNotices);
    });
}

function pastedImageFile(items: DataTransferItemList): File | null {
  for (const item of [...items]) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }
  return null;
}

async function savePastedImage(
  session: SessionView,
  image: File,
): Promise<SessionAttachment> {
  const bytes = Array.from(new Uint8Array(await image.arrayBuffer()));
  return sessionSaveAttachment(session.id, {
    fileName: image.name || undefined,
    mimeType: image.type || "image/png",
    bytes,
  });
}

function appendDraftText(
  drafts: Record<string, string>,
  sessionId: string,
  text: string,
): Record<string, string> {
  const current = drafts[sessionId] ?? "";
  return {
    ...drafts,
    [sessionId]: current.trim().length > 0 ? `${current.trimEnd()} ${text}` : text,
  };
}

function attachmentReference(attachment: SessionAttachment): string {
  return `"${attachment.path}"`;
}

function showQuickInputNotice(
  sessionId: string,
  message: string,
  setPasteNotices: (updater: (current: Record<string, string>) => Record<string, string>) => void,
) {
  setPasteNotices((current) => ({ ...current, [sessionId]: message }));
  window.setTimeout(() => {
    setPasteNotices((current) =>
      current[sessionId] === message ? removeSessionNotice(current, sessionId) : current,
    );
  }, 4500);
}

function removeSessionNotice(
  notices: Record<string, string>,
  sessionId: string,
): Record<string, string> {
  if (!(sessionId in notices)) {
    return notices;
  }
  const next = { ...notices };
  delete next[sessionId];
  return next;
}

async function sendQuickInput(
  session: SessionView,
  draft: string,
  setDrafts: (updater: (current: Record<string, string>) => Record<string, string>) => void,
  setSendingSessionIds: (
    updater: (current: Record<string, boolean>) => Record<string, boolean>,
  ) => void,
  onWrite: (sessionId: string, data: string) => Promise<void>,
) {
  if (draft.length === 0) {
    return;
  }
  setSendingSessionIds((current) => ({ ...current, [session.id]: true }));
  try {
    await sendQuickLine(session, draft, onWrite);
    setDrafts((current) => ({
      ...current,
      [session.id]: "",
    }));
  } catch {
    return;
  } finally {
    setSendingSessionIds((current) => ({ ...current, [session.id]: false }));
  }
}

async function sendQuickLine(
  session: SessionView,
  text: string,
  onWrite: (sessionId: string, data: string) => Promise<void>,
) {
  if (session.kind === "codex") {
    await onWrite(session.id, bracketedPaste(text));
    await sleep(80);
    await onWrite(session.id, codexSubmitData());
    return;
  }
  await onWrite(session.id, `${text}\r`);
}

function bracketedPaste(text: string): string {
  return `\x1b[200~${text.replaceAll("\x1b", "")}\x1b[201~`;
}

function quickInputPlaceholder(kind: SessionKind): string {
  return kind === "codex" ? "Ask Codex and press Enter" : "Type command and press Enter";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function errorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : String(caught);
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
