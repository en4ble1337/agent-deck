// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceInfo } from "@/types";
import { applyWorktreeChanges, getGitStatus } from "@services/tauri";
import { useWorktreeSessionIntegration } from "./useWorktreeSessionIntegration";

vi.mock("@services/tauri", () => ({
  applyWorktreeChanges: vi.fn(),
  getGitStatus: vi.fn(),
}));

const mainWorkspace: WorkspaceInfo = {
  id: "ws-main",
  name: "Main",
  path: "/repo",
  connected: true,
  kind: "main",
  settings: { sidebarCollapsed: false },
};

const worktreeWorkspace: WorkspaceInfo = {
  id: "ws-worktree",
  name: "Feature",
  path: "/worktrees/feature",
  connected: true,
  kind: "worktree",
  parentId: "ws-main",
  worktree: { branch: "feat/feature" },
  settings: { sidebarCollapsed: false },
};

const cleanStatus = {
  branchName: "feat/feature",
  files: [],
  stagedFiles: [],
  unstagedFiles: [],
  totalAdditions: 0,
  totalDeletions: 0,
};

describe("useWorktreeSessionIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGitStatus).mockResolvedValue(cleanStatus);
    vi.mocked(applyWorktreeChanges).mockResolvedValue(undefined);
  });

  it("archives completed worktree sessions with no git changes", async () => {
    const removeThread = vi.fn();
    const { rerender } = renderHook(
      (props: { processing: boolean }) =>
        useWorktreeSessionIntegration({
          workspaces: [mainWorkspace, worktreeWorkspace],
          threadsByWorkspace: { "ws-worktree": [{ id: "thread-1" }] },
          threadStatusById: {
            "thread-1": { isProcessing: props.processing },
          },
          removeThread,
        }),
      { initialProps: { processing: true } },
    );

    rerender({ processing: false });

    await waitFor(() => {
      expect(getGitStatus).toHaveBeenCalledWith("ws-worktree");
      expect(removeThread).toHaveBeenCalledWith("ws-worktree", "thread-1");
    });
    expect(applyWorktreeChanges).not.toHaveBeenCalled();
  });

  it("applies changed worktree sessions before archiving them", async () => {
    vi.mocked(getGitStatus).mockResolvedValue({
      ...cleanStatus,
      files: [{ path: "src/App.tsx", status: "M", additions: 1, deletions: 1 }],
    });
    const removeThread = vi.fn();
    const { rerender } = renderHook(
      (props: { processing: boolean }) =>
        useWorktreeSessionIntegration({
          workspaces: [worktreeWorkspace],
          threadsByWorkspace: { "ws-worktree": [{ id: "thread-1" }] },
          threadStatusById: {
            "thread-1": { isProcessing: props.processing },
          },
          removeThread,
        }),
      { initialProps: { processing: true } },
    );

    rerender({ processing: false });

    await waitFor(() => {
      expect(applyWorktreeChanges).toHaveBeenCalledWith("ws-worktree");
      expect(removeThread).toHaveBeenCalledWith("ws-worktree", "thread-1");
    });
  });

  it("keeps the session visible when integration fails", async () => {
    vi.mocked(getGitStatus).mockResolvedValue({
      ...cleanStatus,
      files: [{ path: "src/App.tsx", status: "M", additions: 1, deletions: 1 }],
    });
    vi.mocked(applyWorktreeChanges).mockRejectedValue(new Error("conflict"));
    const removeThread = vi.fn();
    const onDebug = vi.fn();
    const { rerender } = renderHook(
      (props: { processing: boolean }) =>
        useWorktreeSessionIntegration({
          workspaces: [worktreeWorkspace],
          threadsByWorkspace: { "ws-worktree": [{ id: "thread-1" }] },
          threadStatusById: {
            "thread-1": { isProcessing: props.processing },
          },
          removeThread,
          onDebug,
        }),
      { initialProps: { processing: true } },
    );

    rerender({ processing: false });

    await waitFor(() => {
      expect(applyWorktreeChanges).toHaveBeenCalledWith("ws-worktree");
      expect(onDebug).toHaveBeenCalledWith(
        expect.objectContaining({
          label: "worktree/auto-integrate error",
          source: "error",
        }),
      );
    });
    expect(removeThread).not.toHaveBeenCalled();
  });

  it("does not retire sessions that still need attention", async () => {
    const removeThread = vi.fn();
    const { rerender } = renderHook(
      (props: { processing: boolean; hasUnread: boolean }) =>
        useWorktreeSessionIntegration({
          workspaces: [worktreeWorkspace],
          threadsByWorkspace: { "ws-worktree": [{ id: "thread-1" }] },
          threadStatusById: {
            "thread-1": {
              isProcessing: props.processing,
              hasUnread: props.hasUnread,
            },
          },
          removeThread,
        }),
      { initialProps: { processing: true, hasUnread: false } },
    );

    rerender({ processing: false, hasUnread: true });

    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(getGitStatus).not.toHaveBeenCalled();
    expect(removeThread).not.toHaveBeenCalled();
  });
});
