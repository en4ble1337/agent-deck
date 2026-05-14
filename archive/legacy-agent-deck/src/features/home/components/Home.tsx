import type { ReactNode } from "react";
import type {
  AccountSnapshot,
  LocalUsageSnapshot,
  RateLimitSnapshot,
  ThreadSummary,
  WorkspaceInfo,
} from "../../../types";
import { HomeSessionDashboard } from "./HomeSessionDashboard";
import { HomeUsageSection } from "./HomeUsageSection";
import type { ThreadStatusById } from "../../../utils/threadStatus";
import type {
  LatestAgentRun,
  UsageMetric,
  UsageWorkspaceOption,
} from "../homeTypes";

type HomeProps = {
  onAddWorkspace: () => void;
  onAddWorkspaceFromUrl: () => void;
  onConnectRemoteWorkspace: () => void;
  workspaces: WorkspaceInfo[];
  threadsByWorkspace: Record<string, ThreadSummary[]>;
  threadStatusById: ThreadStatusById;
  activeWorkspaceId: string | null;
  activeThreadId: string | null;
  latestAgentRuns: LatestAgentRun[];
  isLoadingLatestAgents: boolean;
  localUsageSnapshot: LocalUsageSnapshot | null;
  isLoadingLocalUsage: boolean;
  localUsageError: string | null;
  onRefreshLocalUsage: () => void;
  usageMetric: UsageMetric;
  onUsageMetricChange: (metric: UsageMetric) => void;
  usageWorkspaceId: string | null;
  usageWorkspaceOptions: UsageWorkspaceOption[];
  onUsageWorkspaceChange: (workspaceId: string | null) => void;
  accountRateLimits: RateLimitSnapshot | null;
  usageShowRemaining: boolean;
  accountInfo: AccountSnapshot | null;
  onSelectThread: (workspaceId: string, threadId: string) => void;
  onLoadSessionOutput?: (workspaceId: string, threadId: string) => void;
  onSendMessageToThread: (
    workspaceId: string,
    threadId: string,
    text: string,
    images: string[],
  ) => Promise<unknown>;
  orchestratorToggleNode?: ReactNode;
};

export function Home({
  workspaces,
  threadsByWorkspace,
  threadStatusById,
  activeWorkspaceId,
  activeThreadId,
  latestAgentRuns,
  isLoadingLatestAgents,
  localUsageSnapshot,
  isLoadingLocalUsage,
  localUsageError,
  onRefreshLocalUsage,
  usageMetric,
  onUsageMetricChange,
  usageWorkspaceId,
  usageWorkspaceOptions,
  onUsageWorkspaceChange,
  accountRateLimits,
  usageShowRemaining,
  accountInfo,
  onSelectThread,
  onLoadSessionOutput,
  onSendMessageToThread,
  orchestratorToggleNode,
}: HomeProps) {
  return (
    <div className="home">
      <HomeSessionDashboard
        workspaces={workspaces}
        threadsByWorkspace={threadsByWorkspace}
        threadStatusById={threadStatusById}
        activeWorkspaceId={activeWorkspaceId}
        activeThreadId={activeThreadId}
        latestAgentRuns={latestAgentRuns}
        isLoadingLatestAgents={isLoadingLatestAgents}
        onSelectThread={onSelectThread}
        onLoadSessionOutput={onLoadSessionOutput}
        onSendMessageToThread={onSendMessageToThread}
        orchestratorToggleNode={orchestratorToggleNode}
      />
      <HomeUsageSection
        accountInfo={accountInfo}
        accountRateLimits={accountRateLimits}
        isLoadingLocalUsage={isLoadingLocalUsage}
        localUsageError={localUsageError}
        localUsageSnapshot={localUsageSnapshot}
        onRefreshLocalUsage={onRefreshLocalUsage}
        onUsageMetricChange={onUsageMetricChange}
        onUsageWorkspaceChange={onUsageWorkspaceChange}
        usageMetric={usageMetric}
        usageShowRemaining={usageShowRemaining}
        usageWorkspaceId={usageWorkspaceId}
        usageWorkspaceOptions={usageWorkspaceOptions}
      />
    </div>
  );
}
