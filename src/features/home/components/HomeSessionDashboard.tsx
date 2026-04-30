import { useMemo, useState } from "react";
import type { CSSProperties, ChangeEvent, FormEvent, KeyboardEvent } from "react";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import type { ThreadSummary, WorkspaceInfo } from "@/types";
import type { ThreadStatusById } from "@/utils/threadStatus";
import { formatRelativeTime } from "@/utils/time";
import { getWorkspaceAccent } from "@/utils/workspaceAccent";
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
  ) => Promise<unknown>;
};

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

function buildRealSessions({
  workspaces,
  threadsByWorkspace,
  threadStatusById,
  latestAgentRuns,
}: Pick<
  HomeSessionDashboardProps,
  "workspaces" | "threadsByWorkspace" | "threadStatusById" | "latestAgentRuns"
>): SessionTile[] {
  const latestBySession = new Map(
    latestAgentRuns.map((run) => [`${run.workspaceId}:${run.threadId}`, run]),
  );

  return workspaces
    .flatMap((workspace) => {
      const threads = threadsByWorkspace[workspace.id] ?? [];
      return threads.map((thread) => {
        const sessionId = `${workspace.id}:${thread.id}`;
        const latest = latestBySession.get(sessionId);
        const threadStatus = threadStatusById[thread.id];
        const status = getSessionStatus(threadStatus);
        const title = thread.name.trim() || "Untitled session";
        const latestMessage = latest?.message.trim() ?? "";
        const preview =
          latestMessage && latest?.source !== "thread-preview"
            ? latestMessage
            : latestMessage && latestMessage !== title
              ? latestMessage
              : "No recent output loaded yet.";
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
          lastActivityLabel: formatRelativeTime(thread.updatedAt),
          preview,
          attentionLabel,
          source: "real" as const,
        };
      });
    })
    .sort((a, b) => {
      const aThread = threadsByWorkspace[a.workspaceId]?.find(
        (thread) => thread.id === a.threadId,
      );
      const bThread = threadsByWorkspace[b.workspaceId]?.find(
        (thread) => thread.id === b.threadId,
      );
      return (bThread?.updatedAt ?? 0) - (aThread?.updatedAt ?? 0);
    });
}

function SessionTileCard({
  session,
  isSelected,
  draft,
  onFocus,
  onDraftChange,
  onSend,
}: {
  session: SessionTile;
  isSelected: boolean;
  draft: string;
  onFocus: (session: SessionTile) => void;
  onDraftChange: (sessionId: string, value: string) => void;
  onSend: (session: SessionTile, text: string) => void;
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
    if (!text || !canSend) {
      return;
    }
    onSend(session, text);
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
            <input
              type="text"
              value={draft}
              onChange={(event) => onDraftChange(session.id, event.target.value)}
              placeholder="Message this session"
              aria-label={`Message ${session.title}`}
            />
            <button type="submit" disabled={!draft.trim()}>
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

  const activeRealSessionId =
    activeWorkspaceId && activeThreadId
      ? `${activeWorkspaceId}:${activeThreadId}`
      : null;
  const selectedId =
    visibleSessions.find((session) => session.id === selectedSessionId)?.id ??
    visibleSessions.find((session) => session.id === activeRealSessionId)?.id ??
    null;
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

  const handleSend = (session: SessionTile, text: string) => {
    if (!session.threadId) {
      return;
    }
    setDraftsBySessionId((current) => ({ ...current, [session.id]: "" }));
    void onSendMessageToThread(session.workspaceId, session.threadId, text);
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
          {visibleSessions.length > 0 ? (
            visibleSessions.map((session) => (
              <SessionTileCard
                key={session.id}
                session={session}
                isSelected={session.id === selectedId}
                draft={draftsBySessionId[session.id] ?? ""}
                onFocus={handleFocus}
                onDraftChange={handleDraftChange}
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
