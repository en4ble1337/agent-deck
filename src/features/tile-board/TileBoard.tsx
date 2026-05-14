import {
  AlertTriangle,
  Archive,
  LoaderCircle,
  Maximize2,
  MessageSquareText,
  Minimize2,
  Play,
  RotateCcw,
  SendHorizontal,
  Square,
  Terminal,
} from "lucide-react";
import { useEffect, useRef, useState, type ClipboardEvent, type CSSProperties } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { SerializeAddon } from "@xterm/addon-serialize";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import type { SessionAttachment, SessionKind, SessionView } from "@/domain/sessions";
import type { Workspace } from "@/domain/workspaces";
import { sessionReadTranscript, sessionResize, sessionSaveAttachment } from "@/services/ipc";
import { isTauriRuntime } from "@/services/runtime";
import {
  sessionSignal,
  sessionSignalLabel,
  terminalTilePreview,
  type TerminalTilePreview,
} from "@/utils/terminalText";
import { codexQuickPasteData, codexSubmitData } from "@/utils/codexTerminalKeys";
import { formatShortTime } from "@/utils/time";

type Props = {
  sessions: SessionView[];
  selectedWorkspaceId: string | null;
  workspaces: Workspace[];
  minimizedSessionIds: ReadonlySet<string>;
  onArchive: (sessionId: string) => void;
  onCreateSession: (workspaceId: string, kind: SessionKind) => void;
  onEnsureRunning: (sessionId: string) => Promise<SessionView>;
  onFocus: (sessionId: string) => void;
  onMinimize: (sessionId: string) => void;
  onRestart: (sessionId: string) => void;
  onRestoreAll: () => void;
  onStop: (sessionId: string) => void;
  onWrite: (sessionId: string, data: string) => Promise<void>;
};

const CODEX_QUICK_SUBMIT_DELAY_MS = 160;
const TILE_TRANSCRIPT_REPLAY_LIMIT = 200_000;
const TILE_SNAPSHOT_SCROLLBACK = 200;

type TileTerminalSnapshot = {
  cols: number;
  data: string;
  rows: number;
  startedAt: number | null;
};

const tileTerminalSnapshots = new Map<string, TileTerminalSnapshot>();

export default function TileBoard({
  sessions,
  selectedWorkspaceId,
  workspaces,
  minimizedSessionIds,
  onArchive,
  onCreateSession,
  onEnsureRunning,
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
    .sort(compareBoardSessions);
  const minimizedCount = sessions
    .filter((session) => !session.isArchived)
    .filter((session) => minimizedSessionIds.has(session.id))
    .filter((session) => !selectedWorkspaceId || session.workspaceId === selectedWorkspaceId)
    .length;
  const now = useBoardClock(visibleSessions.some((session) => session.hasProcess));
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
        const signal = sessionSignal(session, now);
        const preview = terminalTilePreview(session, signal, now);
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
            <div
              className="terminal-tail"
              onClick={() => onFocus(session.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onFocus(session.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <TerminalPreviewContent
                preview={preview}
                session={session}
                workspaceAccent={workspace?.accent ?? "#48d597"}
              />
            </div>
            <form
              className="quick-input-form"
              onSubmit={(event) => {
                event.preventDefault();
                void sendQuickInput(
                  session,
                  draft,
                  setDrafts,
                  setSendingSessionIds,
                  setPasteNotices,
                  onEnsureRunning,
                  onWrite,
                );
              }}
            >
              <input
                aria-label={`Type into ${session.title}`}
                disabled={isSending}
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
                  session.hasProcess ? quickInputPlaceholder(session.kind) : "Type to start and send"
                }
                value={draft}
              />
              <button
                className="quick-send-button"
                disabled={isSending || draft.length === 0}
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

function useBoardClock(shouldTick: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!shouldTick) {
      return;
    }
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [shouldTick]);

  return now;
}

function TerminalPreviewContent({
  preview,
  session,
  workspaceAccent,
}: {
  preview: TerminalTilePreview;
  session: SessionView;
  workspaceAccent: string;
}) {
  if (session.hasProcess || session.outputTail.length > 0) {
    return <TileTerminalPreview session={session} workspaceAccent={workspaceAccent} />;
  }
  if (preview.kind === "status") {
    const Icon =
      preview.tone === "needs-input"
        ? AlertTriangle
        : preview.tone === "working"
          ? LoaderCircle
          : MessageSquareText;
    return (
      <div className={`tile-status-preview tone-${preview.tone}`}>
        <span className="tile-status-icon">
          <Icon size={20} aria-hidden />
        </span>
        <strong>{preview.title}</strong>
        <small>{preview.detail}</small>
      </div>
    );
  }
  return (
    <TerminalPreviewText
      text={preview.text || "Session is ready. Type below or open the full terminal."}
    />
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

function TileTerminalPreview({
  session,
  workspaceAccent,
}: {
  session: SessionView;
  workspaceAccent: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<XtermTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const writtenRef = useRef("");
  const hydratedRef = useRef(false);
  const latestOutputRef = useRef(session.outputTail);
  const latestHasProcessRef = useRef(session.hasProcess);
  const latestStartedAtRef = useRef(session.startedAt);
  const lastSyncedSizeRef = useRef("");

  useEffect(() => {
    latestOutputRef.current = session.outputTail;
  }, [session.outputTail]);

  useEffect(() => {
    latestHasProcessRef.current = session.hasProcess;
    if (!session.hasProcess) {
      lastSyncedSizeRef.current = "";
    }
  }, [session.hasProcess]);

  useEffect(() => {
    latestStartedAtRef.current = session.startedAt;
    lastSyncedSizeRef.current = "";
  }, [session.startedAt]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const terminal = new XtermTerminal({
      allowProposedApi: false,
      convertEol: true,
      cursorBlink: false,
      disableStdin: true,
      fontFamily: "Cascadia Mono, JetBrains Mono, Consolas, monospace",
      fontSize: 12,
      lineHeight: 1.22,
      scrollback: 4_000,
      theme: terminalTheme(workspaceAccent),
    });
    const fitAddon = new FitAddon();
    const serializeAddon = new SerializeAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(serializeAddon);
    terminal.open(container);
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    let isDisposed = false;
    let isRestoringSnapshot = false;

    const resize = () => {
      if (isRestoringSnapshot) {
        return;
      }
      fitAddon.fit();
      terminal.scrollToBottom();
      syncTilePtySize(session.id, terminal, latestHasProcessRef, lastSyncedSizeRef);
    };
    const snapshot = compatibleSnapshot(session);
    if (snapshot) {
      isRestoringSnapshot = true;
      terminal.resize(snapshot.cols, snapshot.rows);
      terminal.write(snapshot.data, () => {
        if (isDisposed || terminalRef.current !== terminal) {
          return;
        }
        terminal.scrollToBottom();
        isRestoringSnapshot = false;
        resize();
      });
      writtenRef.current = latestOutputRef.current;
      hydratedRef.current = true;
    } else {
      writtenRef.current = "";
      hydratedRef.current = false;
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    if (!snapshot) {
      window.setTimeout(resize, 0);
    }

    if (!snapshot) {
      void sessionReadTranscript(session.id, TILE_TRANSCRIPT_REPLAY_LIMIT)
        .then((transcript) => {
          if (isDisposed || terminalRef.current !== terminal) {
            return;
          }
          const replay = transcript || latestOutputRef.current;
          if (replay.length > 0) {
            terminal.reset();
            writeAndFollowTile(terminal, replay);
            writtenRef.current = replay;
          }
          hydratedRef.current = true;

          const latest = latestOutputRef.current;
          const delta = terminalOutputDelta(writtenRef.current, latest);
          if (delta !== null && delta.length > 0) {
            writeAndFollowTile(terminal, delta);
            writtenRef.current = latest;
          }
        })
        .catch(() => {
          if (isDisposed || terminalRef.current !== terminal) {
            return;
          }
          const fallback = latestOutputRef.current;
          if (fallback.length > 0) {
            terminal.reset();
            writeAndFollowTile(terminal, fallback);
            writtenRef.current = fallback;
          }
          hydratedRef.current = true;
        });
    }

    return () => {
      isDisposed = true;
      rememberTileSnapshot(session.id, latestStartedAtRef.current, terminal, serializeAddon);
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      writtenRef.current = "";
      hydratedRef.current = false;
    };
  }, [session.id, workspaceAccent]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }

    const previous = writtenRef.current;
    const next = session.outputTail;
    if (!hydratedRef.current) {
      return;
    }
    if (next.length === 0 || next === previous) {
      return;
    }

    const delta = terminalOutputDelta(previous, next);
    if (delta !== null) {
      writeAndFollowTile(terminal, delta);
    } else {
      terminal.reset();
      writeAndFollowTile(terminal, next);
    }
    writtenRef.current = next;
  }, [session.outputTail]);

  return <div className="tile-terminal-frame" ref={containerRef} />;
}

function compatibleSnapshot(session: SessionView): TileTerminalSnapshot | null {
  const snapshot = tileTerminalSnapshots.get(session.id);
  if (!snapshot || snapshot.startedAt !== session.startedAt) {
    return null;
  }
  return snapshot;
}

function rememberTileSnapshot(
  sessionId: string,
  startedAt: number | null,
  terminal: XtermTerminal,
  serializeAddon: SerializeAddon,
) {
  try {
    const data = serializeAddon.serialize({ scrollback: TILE_SNAPSHOT_SCROLLBACK });
    if (data.trim().length === 0) {
      tileTerminalSnapshots.delete(sessionId);
      return;
    }
    tileTerminalSnapshots.set(sessionId, {
      cols: terminal.cols,
      data,
      rows: terminal.rows,
      startedAt,
    });
  } catch {
    tileTerminalSnapshots.delete(sessionId);
  }
}

function syncTilePtySize(
  sessionId: string,
  terminal: XtermTerminal,
  latestHasProcessRef: { current: boolean },
  lastSyncedSizeRef: { current: string },
) {
  if (!latestHasProcessRef.current || terminal.cols <= 0 || terminal.rows <= 0) {
    return;
  }
  const sizeKey = `${terminal.cols}x${terminal.rows}`;
  if (lastSyncedSizeRef.current === sizeKey) {
    return;
  }
  lastSyncedSizeRef.current = sizeKey;
  void sessionResize(sessionId, terminal.cols, terminal.rows).catch(() => {
    lastSyncedSizeRef.current = "";
  });
}

function writeAndFollowTile(terminal: XtermTerminal, data: string) {
  terminal.write(data, () => {
    terminal.scrollToBottom();
  });
}

function terminalOutputDelta(previous: string, next: string): string | null {
  if (previous.length === 0) {
    return next;
  }
  if (next.startsWith(previous)) {
    return next.slice(previous.length);
  }

  const maxOverlap = Math.min(previous.length, next.length);
  for (let length = maxOverlap; length > 0; length -= 1) {
    if (previous.slice(previous.length - length) === next.slice(0, length)) {
      return next.slice(length);
    }
  }

  return null;
}

function terminalTheme(workspaceAccent: string) {
  return {
    background: cssVar("--terminal-bg", "#080b0e"),
    foreground: cssVar("--terminal-text", "#d9f0e3"),
    cursor: workspaceAccent,
    selectionBackground: cssVar("--terminal-selection", "#29433a"),
    black: cssVar("--terminal-input-bg", "#0b0f12"),
    blue: cssVar("--info", "#7aa7ff"),
    cyan: cssVar("--focus", "#55c7d7"),
    green: cssVar("--good", "#48d597"),
    magenta: "#d991c2",
    red: cssVar("--danger", "#f07178"),
    white: cssVar("--text", "#e8eee9"),
    yellow: cssVar("--warning", "#f3b74f"),
  };
}

function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
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
  setPasteNotices: (updater: (current: Record<string, string>) => Record<string, string>) => void,
  onEnsureRunning: (sessionId: string) => Promise<SessionView>,
  onWrite: (sessionId: string, data: string) => Promise<void>,
) {
  if (draft.length === 0) {
    return;
  }
  setSendingSessionIds((current) => ({ ...current, [session.id]: true }));
  try {
    const writableSession = session.hasProcess
      ? session
      : await startSessionForQuickInput(session, onEnsureRunning, setPasteNotices);
    await sendQuickLineWithRetry(writableSession, draft, onWrite, onEnsureRunning);
    setDrafts((current) => ({
      ...current,
      [session.id]: "",
    }));
    setPasteNotices((current) => removeSessionNotice(current, session.id));
  } catch (caught) {
    showQuickInputNotice(session.id, errorMessage(caught), setPasteNotices);
  } finally {
    setSendingSessionIds((current) => ({ ...current, [session.id]: false }));
  }
}

async function startSessionForQuickInput(
  session: SessionView,
  onEnsureRunning: (sessionId: string) => Promise<SessionView>,
  setPasteNotices: (updater: (current: Record<string, string>) => Record<string, string>) => void,
): Promise<SessionView> {
  showQuickInputNotice(session.id, "Starting session to send command.", setPasteNotices);
  return onEnsureRunning(session.id);
}

async function sendQuickLineWithRetry(
  session: SessionView,
  text: string,
  onWrite: (sessionId: string, data: string) => Promise<void>,
  onEnsureRunning: (sessionId: string) => Promise<SessionView>,
) {
  try {
    await sendQuickLine(session, text, onWrite);
  } catch (caught) {
    if (!isSessionNotRunningError(caught)) {
      throw caught;
    }
    const restarted = await onEnsureRunning(session.id);
    await sendQuickLine(restarted, text, onWrite);
  }
}

async function sendQuickLine(
  session: SessionView,
  text: string,
  onWrite: (sessionId: string, data: string) => Promise<void>,
) {
  if (session.kind === "codex") {
    await onWrite(session.id, codexQuickPasteData(text));
    await sleep(CODEX_QUICK_SUBMIT_DELAY_MS);
    await onWrite(session.id, codexSubmitData());
    return;
  }
  await onWrite(session.id, `${text}\r`);
}

function quickInputPlaceholder(kind: SessionKind): string {
  return kind === "codex" ? "Ask Codex and press Enter" : "Type command and press Enter";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isSessionNotRunningError(caught: unknown): boolean {
  return errorMessage(caught).toLowerCase().includes("not running");
}

function errorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : String(caught);
}

function compareBoardSessions(left: SessionView, right: SessionView): number {
  const pinnedDelta = Number(right.isPinned) - Number(left.isPinned);
  if (pinnedDelta !== 0) {
    return pinnedDelta;
  }

  const tileDelta = left.tileIndex - right.tileIndex;
  if (tileDelta !== 0) {
    return tileDelta;
  }

  const createdDelta = left.createdAt - right.createdAt;
  if (createdDelta !== 0) {
    return createdDelta;
  }

  return left.id.localeCompare(right.id);
}
