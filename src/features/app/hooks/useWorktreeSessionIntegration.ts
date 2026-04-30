import { useEffect, useRef } from "react";
import type { DebugEntry, WorkspaceInfo } from "@/types";
import type { ThreadStatusById } from "@/utils/threadStatus";
import { applyWorktreeChanges, getGitStatus } from "@services/tauri";

type UseWorktreeSessionIntegrationOptions = {
  workspaces: WorkspaceInfo[];
  threadsByWorkspace: Record<string, Array<{ id: string }>>;
  threadStatusById: ThreadStatusById;
  removeThread: (workspaceId: string, threadId: string) => void;
  onDebug?: (entry: DebugEntry) => void;
};

function hasGitChanges(status: Awaited<ReturnType<typeof getGitStatus>>) {
  return (
    status.files.length > 0 ||
    status.stagedFiles.length > 0 ||
    status.unstagedFiles.length > 0
  );
}

export function useWorktreeSessionIntegration({
  workspaces,
  threadsByWorkspace,
  threadStatusById,
  removeThread,
  onDebug,
}: UseWorktreeSessionIntegrationOptions) {
  const wasProcessingRef = useRef<Record<string, boolean>>({});
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const worktreeIds = new Set(
      workspaces
        .filter((workspace) => (workspace.kind ?? "main") === "worktree")
        .map((workspace) => workspace.id),
    );
    const seenKeys = new Set<string>();

    for (const workspaceId of worktreeIds) {
      const threads = threadsByWorkspace[workspaceId] ?? [];
      for (const thread of threads) {
        const key = `${workspaceId}:${thread.id}`;
        seenKeys.add(key);
        const status = threadStatusById[thread.id];
        const isProcessing = Boolean(status?.isProcessing);
        const wasProcessing = wasProcessingRef.current[key] === true;
        wasProcessingRef.current[key] = isProcessing;

        if (
          !wasProcessing ||
          isProcessing ||
          status?.hasUnread ||
          status?.isReviewing ||
          inFlightRef.current.has(key)
        ) {
          continue;
        }

        inFlightRef.current.add(key);
        onDebug?.({
          id: `${Date.now()}-client-worktree-auto-integrate`,
          timestamp: Date.now(),
          source: "client",
          label: "worktree/auto-integrate",
          payload: { workspaceId, threadId: thread.id },
        });

        void (async () => {
          try {
            const gitStatus = await getGitStatus(workspaceId);
            if (hasGitChanges(gitStatus)) {
              await applyWorktreeChanges(workspaceId);
            }
            removeThread(workspaceId, thread.id);
          } catch (error) {
            onDebug?.({
              id: `${Date.now()}-client-worktree-auto-integrate-error`,
              timestamp: Date.now(),
              source: "error",
              label: "worktree/auto-integrate error",
              payload: {
                workspaceId,
                threadId: thread.id,
                error: error instanceof Error ? error.message : String(error),
              },
            });
          } finally {
            inFlightRef.current.delete(key);
          }
        })();
      }
    }

    for (const key of Object.keys(wasProcessingRef.current)) {
      if (!seenKeys.has(key)) {
        delete wasProcessingRef.current[key];
      }
    }
  }, [onDebug, removeThread, threadStatusById, threadsByWorkspace, workspaces]);
}
