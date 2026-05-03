import { useEffect, useRef, type CSSProperties } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import { Archive, ArrowLeft, RotateCcw, Square, Trash2 } from "lucide-react";
import type { SessionView } from "@/domain/sessions";
import type { Workspace } from "@/domain/workspaces";
import { onSessionOutput } from "@/services/events";
import {
  sessionReadTranscript,
  sessionResize,
  sessionWrite,
} from "@/services/ipc";
import { compactPath } from "@/utils/time";

type Props = {
  session: SessionView;
  workspace: Workspace;
  onArchive: () => void;
  onBack: () => void;
  onDelete: () => void;
  onRestart: () => void;
  onStop: () => void;
};

export default function FocusedSessionView({
  session,
  workspace,
  onArchive,
  onBack,
  onDelete,
  onRestart,
  onStop,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<XtermTerminal | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const terminal = new XtermTerminal({
      allowProposedApi: false,
      convertEol: true,
      cursorBlink: true,
      fontFamily: "Cascadia Mono, JetBrains Mono, Consolas, monospace",
      fontSize: 13,
      lineHeight: 1.18,
      scrollback: 10_000,
      theme: {
        background: cssVar("--terminal-bg", "#080b0e"),
        foreground: cssVar("--terminal-text", "#d9f0e3"),
        cursor: workspace.accent,
        selectionBackground: cssVar("--terminal-selection", "#29433a"),
        black: cssVar("--terminal-input-bg", "#0b0f12"),
        blue: cssVar("--info", "#7aa7ff"),
        cyan: cssVar("--focus", "#55c7d7"),
        green: cssVar("--good", "#48d597"),
        magenta: "#d991c2",
        red: cssVar("--danger", "#f07178"),
        white: cssVar("--text", "#e8eee9"),
        yellow: cssVar("--warning", "#f3b74f"),
      },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    terminalRef.current = terminal;

    const resize = () => {
      fitAddon.fit();
      void sessionResize(session.id, terminal.cols, terminal.rows);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    window.setTimeout(resize, 0);

    void sessionReadTranscript(session.id).then((transcript) => {
      if (transcript) {
        terminal.write(transcript);
      }
      terminal.focus();
    });

    const dataDisposable = terminal.onData((data) => {
      void sessionWrite(session.id, data);
    });

    let unlistenOutput: (() => void) | undefined;
    void onSessionOutput((event) => {
      if (event.payload.sessionId === session.id) {
        terminal.write(event.payload.data);
      }
    }).then((unlisten) => {
      unlistenOutput = unlisten;
    });

    return () => {
      unlistenOutput?.();
      dataDisposable.dispose();
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
    };
  }, [session.id, workspace.accent]);

  useEffect(() => {
    terminalRef.current?.focus();
  }, [session.id]);

  return (
    <main
      className="focused-session"
      style={{ "--workspace-accent": workspace.accent } as CSSProperties}
    >
      <header className="focused-header">
        <button className="secondary-button" type="button" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden />
          Board
        </button>
        <div className="focused-title">
          <span className="accent-dot" />
          <div>
            <h1>{session.title}</h1>
            <p>
              {workspace.name} · {compactPath(workspace.path)} · {session.status}
            </p>
          </div>
        </div>
        <div className="focused-actions">
          <button className="secondary-button" type="button" onClick={onStop}>
            <Square size={16} aria-hidden />
            Stop
          </button>
          <button className="secondary-button" type="button" onClick={onRestart}>
            <RotateCcw size={16} aria-hidden />
            Restart
          </button>
          <button className="secondary-button" type="button" onClick={onArchive}>
            <Archive size={16} aria-hidden />
            Archive
          </button>
          <button className="danger-button" type="button" onClick={onDelete}>
            <Trash2 size={16} aria-hidden />
            Delete
          </button>
        </div>
      </header>
      <section className="terminal-frame" ref={containerRef} />
    </main>
  );
}

function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}
