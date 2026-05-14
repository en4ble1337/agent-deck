import {
  Archive,
  BarChart3,
  Bot,
  Cloud,
  Maximize2,
  Play,
  RotateCcw,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { CommandPreset } from "@/domain/presets";
import type { SessionKind, SessionView } from "@/domain/sessions";
import type { Workspace } from "@/domain/workspaces";
import { compactPath, formatShortTime } from "@/utils/time";

export type BoardUtilityPanelId = "activity" | "archive" | "presets";

type Props = {
  panel: BoardUtilityPanelId;
  presets: CommandPreset[];
  selectedWorkspaceId: string | null;
  sessions: SessionView[];
  workspaces: Workspace[];
  onClose: () => void;
  onCreateSession: (workspaceId: string, kind: SessionKind) => void;
  onDeleteSession: (sessionId: string) => void;
  onFocusSession: (sessionId: string) => void;
  onRestoreSession: (sessionId: string) => void;
};

export default function BoardUtilityPanel({
  panel,
  presets,
  selectedWorkspaceId,
  sessions,
  workspaces,
  onClose,
  onCreateSession,
  onDeleteSession,
  onFocusSession,
  onRestoreSession,
}: Props) {
  const selectedWorkspace =
    selectedWorkspaceId ? workspaces.find((workspace) => workspace.id === selectedWorkspaceId) : null;
  const [launchWorkspaceId, setLaunchWorkspaceId] = useState(
    selectedWorkspaceId ?? workspaces[0]?.id ?? "",
  );

  useEffect(() => {
    if (selectedWorkspaceId) {
      setLaunchWorkspaceId(selectedWorkspaceId);
      return;
    }
    setLaunchWorkspaceId((current) =>
      current && workspaces.some((workspace) => workspace.id === current)
        ? current
        : workspaces[0]?.id ?? "",
    );
  }, [selectedWorkspaceId, workspaces]);

  const title = panelTitle(panel);
  const Icon = panelIcon(panel);

  return (
    <aside className="utility-drawer" aria-label={title}>
      <header className="utility-drawer-header">
        <div>
          <p className="eyebrow">
            <Icon size={14} aria-hidden />
            {selectedWorkspace?.name ?? "All workspaces"}
          </p>
          <h2>{title}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} title="Close">
          <X size={17} aria-hidden />
        </button>
      </header>

      {panel === "activity" ? (
        <ActivityPanel
          selectedWorkspaceId={selectedWorkspaceId}
          sessions={sessions}
          workspaces={workspaces}
        />
      ) : null}

      {panel === "presets" ? (
        <PresetsPanel
          launchWorkspaceId={launchWorkspaceId}
          presets={presets}
          workspaces={workspaces}
          onCreateSession={onCreateSession}
          onLaunchWorkspaceChange={setLaunchWorkspaceId}
        />
      ) : null}

      {panel === "archive" ? (
        <ArchivePanel
          selectedWorkspaceId={selectedWorkspaceId}
          sessions={sessions}
          workspaces={workspaces}
          onDeleteSession={onDeleteSession}
          onFocusSession={onFocusSession}
          onRestoreSession={onRestoreSession}
        />
      ) : null}
    </aside>
  );
}

function ActivityPanel({
  selectedWorkspaceId,
  sessions,
  workspaces,
}: {
  selectedWorkspaceId: string | null;
  sessions: SessionView[];
  workspaces: Workspace[];
}) {
  const scopedSessions = scoped(sessions, selectedWorkspaceId);
  const visibleSessions = scopedSessions.filter((session) => !session.isArchived);
  const liveSessions = visibleSessions.filter((session) => session.hasProcess);
  const archivedSessions = scopedSessions.filter((session) => session.isArchived);
  const transcriptBytes = scopedSessions.reduce(
    (total, session) => total + session.outputTail.length,
    0,
  );
  const recentSessions = [...visibleSessions]
    .sort((left, right) => right.lastActiveAt - left.lastActiveAt)
    .slice(0, 6);
  const workspaceRows = workspaces
    .map((workspace) => {
      const workspaceSessions = sessions.filter((session) => session.workspaceId === workspace.id);
      return {
        workspace,
        archived: workspaceSessions.filter((session) => session.isArchived).length,
        live: workspaceSessions.filter((session) => !session.isArchived && session.hasProcess).length,
        total: workspaceSessions.filter((session) => !session.isArchived).length,
      };
    })
    .filter((row) => row.total > 0 || row.archived > 0);

  return (
    <div className="utility-drawer-body">
      <div className="metric-grid">
        <Metric label="On board" value={visibleSessions.length} />
        <Metric label="Live" value={liveSessions.length} />
        <Metric label="Archived" value={archivedSessions.length} />
        <Metric label="Tail cache" value={formatBytes(transcriptBytes)} />
      </div>

      <section className="utility-section">
        <h3>Workspaces</h3>
        <div className="workspace-metric-list">
          {workspaceRows.length === 0 ? (
            <p className="utility-muted">No session activity yet.</p>
          ) : (
            workspaceRows.map((row) => (
              <div
                className="workspace-metric-row"
                key={row.workspace.id}
                style={{ "--workspace-accent": row.workspace.accent } as CSSProperties}
              >
                <span className="accent-dot" aria-hidden />
                <span>
                  <strong>{row.workspace.name}</strong>
                  <small>{compactPath(row.workspace.path)}</small>
                </span>
                <span>{row.live} live</span>
                <span>{row.archived} archived</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="utility-section">
        <h3>Recent</h3>
        <div className="utility-session-list">
          {recentSessions.length === 0 ? (
            <p className="utility-muted">No recent sessions.</p>
          ) : (
            recentSessions.map((session) => (
              <CompactSessionRow
                key={session.id}
                session={session}
                workspace={workspaces.find((workspace) => workspace.id === session.workspaceId)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function PresetsPanel({
  launchWorkspaceId,
  presets,
  workspaces,
  onCreateSession,
  onLaunchWorkspaceChange,
}: {
  launchWorkspaceId: string;
  presets: CommandPreset[];
  workspaces: Workspace[];
  onCreateSession: (workspaceId: string, kind: SessionKind) => void;
  onLaunchWorkspaceChange: (workspaceId: string) => void;
}) {
  const launchWorkspace = workspaces.find((workspace) => workspace.id === launchWorkspaceId);

  return (
    <div className="utility-drawer-body">
      <label className="utility-select-label">
        <span>Workspace</span>
        <select
          value={launchWorkspaceId}
          onChange={(event) => onLaunchWorkspaceChange(event.target.value)}
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
      </label>

      <div className="preset-launch-list">
        {presets.map((preset) => (
          <article className="preset-launch-row" key={preset.id}>
            <div className="preset-launch-icon">
              <PresetIcon kind={preset.kind} />
            </div>
            <div>
              <strong>{preset.name}</strong>
              <small>{preset.command || "Default shell"}</small>
            </div>
            <button
              className="secondary-button"
              disabled={!launchWorkspace}
              type="button"
              onClick={() => {
                if (launchWorkspace) {
                  onCreateSession(launchWorkspace.id, preset.kind);
                }
              }}
            >
              <Play size={14} aria-hidden />
              Start
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function ArchivePanel({
  selectedWorkspaceId,
  sessions,
  workspaces,
  onDeleteSession,
  onFocusSession,
  onRestoreSession,
}: {
  selectedWorkspaceId: string | null;
  sessions: SessionView[];
  workspaces: Workspace[];
  onDeleteSession: (sessionId: string) => void;
  onFocusSession: (sessionId: string) => void;
  onRestoreSession: (sessionId: string) => void;
}) {
  const archivedSessions = scoped(sessions, selectedWorkspaceId)
    .filter((session) => session.isArchived)
    .sort((left, right) => right.lastActiveAt - left.lastActiveAt);

  return (
    <div className="utility-drawer-body">
      {archivedSessions.length === 0 ? (
        <div className="utility-empty">
          <Archive size={24} aria-hidden />
          <strong>No archived sessions</strong>
        </div>
      ) : (
        <div className="archive-session-list">
          {archivedSessions.map((session) => {
            const workspace = workspaces.find((candidate) => candidate.id === session.workspaceId);
            return (
              <article
                className="archive-session-row"
                key={session.id}
                style={{ "--workspace-accent": workspace?.accent ?? "#48d597" } as CSSProperties}
              >
                <CompactSessionRow session={session} workspace={workspace} />
                <div className="archive-session-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => onFocusSession(session.id)}
                  >
                    <Maximize2 size={14} aria-hidden />
                    Open
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => onRestoreSession(session.id)}
                  >
                    <RotateCcw size={14} aria-hidden />
                    Restore
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => onDeleteSession(session.id)}
                  >
                    <Trash2 size={14} aria-hidden />
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function CompactSessionRow({
  session,
  workspace,
}: {
  session: SessionView;
  workspace: Workspace | undefined;
}) {
  return (
    <div
      className="utility-session-row"
      style={{ "--workspace-accent": workspace?.accent ?? "#48d597" } as CSSProperties}
    >
      <span className={`status-dot status-${session.status}`} />
      <span>
        <strong>{session.title}</strong>
        <small>
          {workspace?.name ?? "Workspace"} - {session.kind} - {formatShortTime(session.lastActiveAt)}
        </small>
      </span>
    </div>
  );
}

function PresetIcon({ kind }: { kind: SessionKind }) {
  if (kind === "codex") {
    return <Bot size={17} aria-hidden />;
  }
  if (kind === "claude") {
    return <Cloud size={17} aria-hidden />;
  }
  return <Terminal size={17} aria-hidden />;
}

function scoped(sessions: SessionView[], selectedWorkspaceId: string | null): SessionView[] {
  return selectedWorkspaceId
    ? sessions.filter((session) => session.workspaceId === selectedWorkspaceId)
    : sessions;
}

function panelTitle(panel: BoardUtilityPanelId): string {
  switch (panel) {
    case "activity":
      return "Activity";
    case "archive":
      return "Archive";
    case "presets":
      return "Presets";
  }
}

function panelIcon(panel: BoardUtilityPanelId) {
  switch (panel) {
    case "activity":
      return BarChart3;
    case "archive":
      return Archive;
    case "presets":
      return Terminal;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
