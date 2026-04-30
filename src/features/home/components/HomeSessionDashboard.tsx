import { useMemo, useState } from "react";
import type {
  CSSProperties,
  ChangeEvent,
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
} from "react";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import type { ThreadSummary, WorkspaceInfo } from "@/types";
import type { ThreadStatusById } from "@/utils/threadStatus";
import { formatRelativeTime } from "@/utils/time";
import { deriveThreadContextTitle } from "@/utils/threadDisplay";
import { getWorkspaceAccent } from "@/utils/workspaceAccent";
import { ComposerAttachments } from "@/features/composer/components/ComposerAttachments";
import type { LatestAgentRun } from "../homeTypes";

type SessionStatus = "running" | "review" | "attention" | "idle" | "stopped";
type SessionSource = "real" | "fixture";
type SessionFilter = "all" | "running" | "attention";
type WorkspaceFilter = "all" | string;

type SessionTile = {
  id: string;
  title: string;
  workspace: string;
  workspaceId: string;
  workspaceAccent: string;
  threadId: string | null;
  agent: string;
  status: SessionStatus;
  runtimeLabel: string;
  lastActivityLabel: string;
  preview: string;
  attentionLabel: string | null;
  source: SessionSource;
  updatedAt: number;
};

type HomeSessionDashboardProps = {
  workspaces: WorkspaceInfo[];
  threadsByWorkspace: Record<string, ThreadSummary[]>;
  threadStatusById: ThreadStatusById;
  latestAgentRuns: LatestAgentRun[];
  isLoadingLatestAgents: boolean;
  activeWorkspaceId: string | null;
  activeThreadId: string | null;
  onSelectThread: (workspaceId: string, threadId: string) => void;
  onSendMessageToThread: (
    workspaceId: string,
    threadId: string,
    text: string,
    images: string[],
  ) => Promise<unknown>;
};

const SESSION_DECK_LIMIT = 12;
const SESSION_DECK_IDLE_LIMIT = 4;

const FIXTURE_SESSIONS: SessionTile[] = [
  {
    id: "fixture:foundation",
    title: "Codex Monitor foundation",
    workspace: "agent-deck",
    workspaceId: "fixture",
    workspaceAccent: "#46d9c8",
    threadId: null,
    agent: "codex",
    status: "running",
    runtimeLabel: "12m",
    lastActivityLabel: "now",
    preview: "Root app is running from the CodexMonitor shell with the glass layout intact.",
    attentionLabel: null,
    source: "fixture",
    updatedAt: 4,
  },
  {
    id: "fixture:tiles",
    title: "AGX tile model",
    workspace: "agent-deck",
    workspaceId: "fixture",
    workspaceAccent: "#46d9c8",
    threadId: null,
    agent: "claude",
    status: "review",
    runtimeLabel: "31m",
    lastActivityLabel: "4m ago",
    preview: "Map board-style agent phases into compact, scannable session tiles.",
    attentionLabel: "layout check",
    source: "fixture",
    updatedAt: 3,
  },
  {
    id: "fixture:workspace",
    title: "Workspace intake",
    workspace: "CodexMonitor",
    workspaceId: "fixture",
    workspaceAccent: "#8fb3ff",
    threadId: null,
    agent: "codex",
    status: "idle",
    runtimeLabel: "1h 08m",
    lastActivityLabel: "18m ago",
    preview: "Project registration, recent sessions, and local-first controls stay in view.",
    attentionLabel: null,
    source: "fixture",
    updatedAt: 2,
  },
  {
    id: "fixture:diff",
    title: "Review surface",
    workspace: "CodexMonitor",
    workspaceId: "fixture",
    workspaceAccent: "#8fb3ff",
    threadId: null,
    agent: "codex",
    status: "attention",
    runtimeLabel: "46m",
    lastActivityLabel: "23m ago",
    preview: "Diff, terminal, and plan surfaces remain available after focusing a tile.",
    attentionLabel: "needs response",
    source: "fixture",
    updatedAt: 1,
  },
];

function getThreadAgent(thread: ThreadSummary) {
  const nickname = thread.subagentNickname?.trim();
  if (nickname) {
    return nickname;
  }
  const role = thread.subagentRole?.trim();
  if (role) {
    return role;
  }
  const modelId = thread.modelId?.trim();
  if (!modelId) {
    return thread.isSubagent ? "subagent" : "codex";
  }
  return modelId.toLowerCase().includes("codex") ? "codex" : modelId;
}

function formatRuntime(startedAt: number | undefined, updatedAt: number) {
  const start = startedAt ?? updatedAt;
  const elapsedMs = Math.max(0, Date.now() - start);
  const elapsedMinutes = Math.max(1, Math.round(elapsedMs / 60000));
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m`;
  }
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function getSessionStatus(
  status: ThreadStatusById[string] | undefined,
): SessionStatus {
  if (status?.hasUnread) {
    return "attention";
  }
  if (status?.isReviewing) {
    return "review";
  }
  if (status?.isProcessing) {
    return "running";
  }
  return "idle";
}

function getStatusLabel(status: SessionStatus) {
  switch (status) {
    case "attention":
      return "Needs input";
    case "review":
      return "Review";
    case "running":
      return "Running";
    case "stopped":
      return "Stopped";
    case "idle":
    default:
      return "Idle";
  }
}

function readFilesAsDataUrls(files: File[]) {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve(typeof reader.result === "string" ? reader.result : "");
          reader.onerror = () => resolve("");
          reader.readAsDataURL(file);
        }),
    ),
  ).then((items) => items.filter(Boolean));
}

function getSessionBoardPriority(session: SessionTile) {
  if (session.status === "attention" || session.attentionLabel) {
    return 0;
  }
  if (session.status === "running") {
    return 1;
  }
  if (session.status === "review") {
    return 2;
  }
  if (session.status === "idle") {
    return 3;
  }
  return 4;
}

function isActionableSession(session: SessionTile) {
  return getSessionBoardPriority(session) < 3;
}

function sortSessionsForBoard(sessions: SessionTile[]) {
  return sessions.slice().sort((a, b) => {
    const priorityDiff = getSessionBoardPriority(a) - getSessionBoardPriority(b);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return b.updatedAt - a.updatedAt;
  });
}

function buildRealSessions({
  workspaces,
  threadsByWorkspace,
  threadStatusById,
  latestAgentRuns,
}: Pick<
  HomeSessionDashboardProps,
  "workspaces" | "threadsByWorkspace" | "threadStatusById" | "latestAgentRuns"
>): SessionTile[] {
  const latestBySession = new Map<string, LatestAgentRun>();
  latestAgentRuns.forEach((run) => {
    const sessionId = `${run.workspaceId}:${run.threadId}`;
    const existing = latestBySession.get(sessionId);
    if (!existing || run.timestamp >= existing.timestamp) {
      latestBySession.set(sessionId, run);
    }
  });

  return workspaces
    .flatMap((workspace) => {
      const threads = threadsByWorkspace[workspace.id] ?? [];
      return threads.map((thread) => {
        const sessionId = `${workspace.id}:${thread.id}`;
        const latest = latestBySession.get(sessionId);
        const threadStatus = threadStatusById[thread.id];
        const status = getSessionStatus(threadStatus);
        const threadName = thread.name.trim() || "Untitled session";
        const latestMessage = latest?.message.trim() ?? "";
        const activityTimestamp = Math.max(thread.updatedAt, latest?.timestamp ?? 0);
        const preview =
          latestMessage && latest?.source !== "thread-preview"
            ? latestMessage
            : latestMessage && latestMessage !== threadName
              ? latestMessage
              : "No recent output loaded yet.";
        const title = deriveThreadContextTitle(threadName, latestMessage);
        const attentionLabel = !workspace.connected
          ? "offline"
          : threadStatus?.hasUnread
            ? "needs response"
            : null;

        return {
          id: sessionId,
          title,
          workspace: workspace.name,
          workspaceId: workspace.id,
          workspaceAccent: getWorkspaceAccent(workspace.id, workspace.name),
          threadId: thread.id,
          agent: getThreadAgent(thread),
          status,
          runtimeLabel: formatRuntime(thread.createdAt, thread.updatedAt),
          lastActivityLabel: formatRelativeTime(activityTimestamp),
          preview,
          attentionLabel,
          source: "real" as const,
          updatedAt: activityTimestamp,
        };
      });
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function SessionTileCard({
  session,
  isSelected,
  draft,
  images,
  onFocus,
  onDraftChange,
  onAttachImages,
  onRemoveImage,
  onSend,
}: {
  session: SessionTile;
  isSelected: boolean;
  draft: string;
  images: string[];
  onFocus: (session: SessionTile) => void;
  onDraftChange: (sessionId: string, value: string) => void;
  onAttachImages: (sessionId: string, images: string[]) => void;
  onRemoveImage: (sessionId: string, image: string) => void;
  onSend: (session: SessionTile, text: string, images: string[]) => void;
}) {
  const statusLabel = getStatusLabel(session.status);
  const canSend = session.source === "real" && Boolean(session.threadId);
  const tileStyle = {
    "--session-workspace-accent": session.workspaceAccent,
  } as CSSProperties;
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onFocus(session);
    }
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const text = draft.trim();
    if ((!text && images.length === 0) || !canSend) {
      return;
    }
    onSend(session, text, images);
  };
  const handlePaste = async (event: ClipboardEvent<HTMLInputElement>) => {
    if (!canSend) {
      return;
    }
    const items = Array.from(event.clipboardData?.items ?? []);
    const imageItems = items.filter((item) => item.type.startsWith("image/"));
    if (imageItems.length === 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const files = imageItems
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (files.length === 0) {
      return;
    }
    const text = event.clipboardData?.getData("text/plain") ?? "";
    if (text) {
      const target = event.currentTarget;
      const start = target.selectionStart ?? draft.length;
      const end = target.selectionEnd ?? start;
      const nextDraft = `${draft.slice(0, start)}${text}${draft.slice(end)}`;
      onDraftChange(session.id, nextDraft);
    }
    const dataUrls = await readFilesAsDataUrls(files);
    if (dataUrls.length > 0) {
      onAttachImages(session.id, dataUrls);
    }
  };

  return (
    <article
      className={`session-tile is-${session.status}${
        isSelected ? " is-selected" : ""
      }`}
      style={tileStyle}
    >
      <div
        className="session-tile-body"
        role="button"
        tabIndex={0}
        onClick={() => onFocus(session)}
        onKeyDown={handleKeyDown}
        aria-pressed={isSelected}
      >
        <div className="session-tile-topline">
          <span className="session-tile-agent">{session.agent}</span>
          <span className="session-tile-status">{statusLabel}</span>
        </div>
        <div className="session-tile-title">{session.title}</div>
        <div className="session-tile-meta">
          <span className="session-tile-workspace">{session.workspace}</span>
          <span>{session.runtimeLabel}</span>
          <span>{session.lastActivityLabel}</span>
        </div>
        <div className="session-tile-output">{session.preview}</div>
        {session.attentionLabel && (
          <div className="session-tile-attention">
            <AlertTriangle aria-hidden />
            <span>{session.attentionLabel}</span>
          </div>
        )}
        {canSend && (
          <form
            className="session-tile-command"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="session-tile-command-main">
              <ComposerAttachments
                attachments={images}
                disabled={!canSend}
                onRemoveAttachment={(image) => onRemoveImage(session.id, image)}
              />
              <input
                type="text"
                value={draft}
                onChange={(event) => onDraftChange(session.id, event.target.value)}
                onPaste={handlePaste}
                placeholder="Message this session"
                aria-label={`Message ${session.title}`}
              />
            </div>
            <button type="submit" disabled={!draft.trim() && images.length === 0}>
              Send
            </button>
          </form>
        )}
      </div>
    </article>
  );
}

function SessionDashboardSkeleton() {
  return (
    <div
      className="session-dashboard-grid session-dashboard-grid-loading"
      aria-label="Loading sessions"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="session-tile session-tile-skeleton" key={index}>
          <span className="session-skeleton-line session-skeleton-short" />
          <span className="session-skeleton-line session-skeleton-title" />
          <span className="session-skeleton-line" />
          <span className="session-skeleton-line session-skeleton-medium" />
        </div>
      ))}
    </div>
  );
}

export function HomeSessionDashboard({
  workspaces,
  threadsByWorkspace,
  threadStatusById,
  latestAgentRuns,
  isLoadingLatestAgents,
  activeWorkspaceId,
  activeThreadId,
  onSelectThread,
  onSendMessageToThread,
}: HomeSessionDashboardProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("all");
  const [workspaceFilter, setWorkspaceFilter] = useState<WorkspaceFilter>("all");
  const [draftsBySessionId, setDraftsBySessionId] = useState<Record<string, string>>({});
  const [imagesBySessionId, setImagesBySessionId] = useState<Record<string, string[]>>({});

  const realSessions = useMemo(
    () =>
      buildRealSessions({
        workspaces,
        threadsByWorkspace,
        threadStatusById,
        latestAgentRuns,
      }),
    [latestAgentRuns, threadStatusById, threadsByWorkspace, workspaces],
  );

  const sessions = useMemo(() => {
    return realSessions.length > 0 ? realSessions : FIXTURE_SESSIONS;
  }, [realSessions]);

  const workspaceOptions = useMemo(() => {
    const options = new Map<
      string,
      { id: string; name: string; accent: string; count: number }
    >();
    for (const session of sessions) {
      const existing = options.get(session.workspaceId);
      if (existing) {
        existing.count += 1;
      } else {
        options.set(session.workspaceId, {
          id: session.workspaceId,
          name: session.workspace,
          accent: session.workspaceAccent,
          count: 1,
        });
      }
    }
    return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  const workspaceFilteredSessions = useMemo(() => {
    if (workspaceFilter === "all") {
      return sessions;
    }
    return sessions.filter((session) => session.workspaceId === workspaceFilter);
  }, [sessions, workspaceFilter]);

  const visibleSessions = useMemo(() => {
    if (sessionFilter === "running") {
      return workspaceFilteredSessions.filter((session) => session.status === "running");
    }
    if (sessionFilter === "attention") {
      return workspaceFilteredSessions.filter(
        (session) => session.status === "attention" || Boolean(session.attentionLabel),
      );
    }
    return workspaceFilteredSessions;
  }, [sessionFilter, workspaceFilteredSessions]);
  const boardSortedSessions = useMemo(
    () => sortSessionsForBoard(visibleSessions),
    [visibleSessions],
  );
  const activeRealSessionId =
    activeWorkspaceId && activeThreadId
      ? `${activeWorkspaceId}:${activeThreadId}`
      : null;
  const selectedId =
    visibleSessions.find((session) => session.id === selectedSessionId)?.id ??
    visibleSessions.find((session) => session.id === activeRealSessionId)?.id ??
    null;
  const deckSessions = useMemo(() => {
    const boardCandidates =
      sessionFilter === "all"
        ? [
            ...boardSortedSessions.filter(isActionableSession),
            ...boardSortedSessions
              .filter((session) => !isActionableSession(session))
              .slice(0, SESSION_DECK_IDLE_LIMIT),
          ]
        : boardSortedSessions;
    const firstSessions = boardCandidates.slice(0, SESSION_DECK_LIMIT);
    if (!selectedId || firstSessions.some((session) => session.id === selectedId)) {
      return firstSessions;
    }
    const selectedSession = boardSortedSessions.find((session) => session.id === selectedId);
    if (!selectedSession) {
      return firstSessions;
    }
    return [
      ...firstSessions.slice(0, Math.max(0, SESSION_DECK_LIMIT - 1)),
      selectedSession,
    ];
  }, [boardSortedSessions, selectedId, sessionFilter]);
  const runningCount = workspaceFilteredSessions.filter((session) => session.status === "running").length;
  const attentionCount = workspaceFilteredSessions.filter(
    (session) => session.status === "attention" || session.attentionLabel,
  ).length;
  const showLoadingSessions =
    isLoadingLatestAgents && realSessions.length === 0 && sessions.length === 0;

  const handleFocus = (session: SessionTile) => {
    setSelectedSessionId(session.id);
    if (session.threadId) {
      onSelectThread(session.workspaceId, session.threadId);
    }
  };

  const setFilter = (filter: SessionFilter) => {
    setSessionFilter((current) => (current === filter ? "all" : filter));
  };

  const handleWorkspaceFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setWorkspaceFilter(event.target.value);
  };

  const handleDraftChange = (sessionId: string, value: string) => {
    setDraftsBySessionId((current) => ({ ...current, [sessionId]: value }));
  };

  const handleAttachImages = (sessionId: string, images: string[]) => {
    if (images.length === 0) {
      return;
    }
    setImagesBySessionId((current) => {
      const existing = current[sessionId] ?? [];
      return {
        ...current,
        [sessionId]: Array.from(new Set([...existing, ...images])),
      };
    });
  };

  const handleRemoveImage = (sessionId: string, image: string) => {
    setImagesBySessionId((current) => {
      const existing = current[sessionId] ?? [];
      const next = existing.filter((entry) => entry !== image);
      if (next.length === 0) {
        const { [sessionId]: _, ...rest } = current;
        return rest;
      }
      return { ...current, [sessionId]: next };
    });
  };

  const handleSend = (session: SessionTile, text: string, images: string[]) => {
    if (!session.threadId) {
      return;
    }
    setDraftsBySessionId((current) => ({ ...current, [session.id]: "" }));
    setImagesBySessionId((current) => {
      const { [session.id]: _, ...rest } = current;
      return rest;
    });
    void onSendMessageToThread(session.workspaceId, session.threadId, text, images);
  };

  return (
    <section className="session-dashboard" aria-labelledby="session-dashboard-title">
      <div className="session-dashboard-header">
        <div className="session-dashboard-heading">
          <div className="session-dashboard-kicker">Session deck</div>
          <h1 id="session-dashboard-title">Agent Deck</h1>
        </div>
        <div className="session-dashboard-controls">
          <label className="session-workspace-filter">
            <span>Workspace</span>
            <select
              value={workspaceFilter}
              onChange={handleWorkspaceFilterChange}
              aria-label="Filter sessions by workspace"
            >
              <option value="all">All workspaces</option>
              {workspaceOptions.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name} ({workspace.count})
                </option>
              ))}
            </select>
          </label>
          <div className="session-dashboard-stats" aria-label="Session filters">
            <button
              className={`session-dashboard-stat${sessionFilter === "all" ? " is-active" : ""}`}
              type="button"
              onClick={() => setFilter("all")}
              aria-pressed={sessionFilter === "all"}
            >
              <span>{workspaceFilteredSessions.length}</span>
              <span>sessions</span>
            </button>
            <button
              className={`session-dashboard-stat${sessionFilter === "running" ? " is-active" : ""}`}
              type="button"
              onClick={() => setFilter("running")}
              aria-pressed={sessionFilter === "running"}
            >
              <span>{runningCount}</span>
              <span>running</span>
            </button>
            <button
              className={`session-dashboard-stat${sessionFilter === "attention" ? " is-active" : ""}`}
              type="button"
              onClick={() => setFilter("attention")}
              aria-pressed={sessionFilter === "attention"}
            >
              <span>{attentionCount}</span>
              <span>attention</span>
            </button>
          </div>
        </div>
      </div>

      {showLoadingSessions ? (
        <SessionDashboardSkeleton />
      ) : (
        <div className="session-dashboard-grid" aria-label="Agent sessions">
          {deckSessions.length > 0 ? (
            deckSessions.map((session) => (
              <SessionTileCard
                key={session.id}
                session={session}
                isSelected={session.id === selectedId}
                draft={draftsBySessionId[session.id] ?? ""}
                images={imagesBySessionId[session.id] ?? []}
                onFocus={handleFocus}
                onDraftChange={handleDraftChange}
                onAttachImages={handleAttachImages}
                onRemoveImage={handleRemoveImage}
                onSend={handleSend}
              />
            ))
          ) : (
            <div className="session-dashboard-empty">
              No sessions match this workspace and status filter.
            </div>
          )}
        </div>
      )}

    </section>
  );
}
