// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ModelOption, WorkspaceInfo } from "../../../types";
import { generateRunMetadata } from "../../../services/tauri";
import { useWorkspaceHome } from "./useWorkspaceHome";

vi.mock("../../../services/tauri", () => ({
  generateRunMetadata: vi.fn(),
}));

const workspace: WorkspaceInfo = {
  id: "ws-1",
  name: "Project",
  path: "/tmp/project",
  connected: true,
  kind: "main",
  settings: { sidebarCollapsed: false },
};

const models: ModelOption[] = [
  {
    id: "id-1",
    model: "gpt-5.1-max",
    displayName: "GPT-5.1 Max",
    description: "Test model",
    supportedReasoningEfforts: [
      { reasoningEffort: "low", description: "Low effort" },
      { reasoningEffort: "medium", description: "Medium effort" },
      { reasoningEffort: "high", description: "High effort" },
    ],
    defaultReasoningEffort: "medium",
    isDefault: false,
  },
];

describe("useWorkspaceHome", () => {
  it("always exposes local mode for new workspace runs", () => {
    const { result } = renderHook(() =>
      useWorkspaceHome({
        activeWorkspace: workspace,
        models,
        selectedModelId: null,
        connectWorkspace: vi.fn(),
        startThreadForWorkspace: vi.fn(),
        sendUserMessageToThread: vi.fn(),
      }),
    );

    expect(result.current.runMode).toBe("local");

    act(() => {
      result.current.setRunMode("worktree");
    });

    expect(result.current.runMode).toBe("local");
  });

  it("starts runs in the active workspace", async () => {
    const connectWorkspace = vi.fn().mockResolvedValue(undefined);
    const startThreadForWorkspace = vi.fn().mockResolvedValue("thread-1");
    const sendUserMessageToThread = vi.fn().mockResolvedValue(undefined);
    const seedThreadCodexParams = vi.fn();
    vi.mocked(generateRunMetadata).mockResolvedValue({
      title: "Local run",
      worktreeName: "feat/local-run",
    });

    const { result } = renderHook(() =>
      useWorkspaceHome({
        activeWorkspace: workspace,
        models,
        selectedModelId: "id-1",
        seedThreadCodexParams,
        connectWorkspace,
        startThreadForWorkspace,
        sendUserMessageToThread,
      }),
    );

    act(() => {
      result.current.setDraft("Hello local");
    });

    await act(async () => {
      const started = await result.current.startRun();
      expect(started).toBe(true);
    });

    expect(startThreadForWorkspace).toHaveBeenCalledWith("ws-1", {
      activate: false,
    });
    expect(sendUserMessageToThread).toHaveBeenCalledWith(
      workspace,
      "thread-1",
      "Hello local",
      [],
      expect.objectContaining({ model: "gpt-5.1-max" }),
    );
    expect(seedThreadCodexParams).toHaveBeenCalledWith("ws-1", "thread-1", {
      modelId: "id-1",
      effort: null,
      serviceTier: undefined,
    });
  });

  it("allows image-only local runs", async () => {
    const connectWorkspace = vi.fn().mockResolvedValue(undefined);
    const startThreadForWorkspace = vi.fn().mockResolvedValue("thread-1");
    const sendUserMessageToThread = vi.fn().mockResolvedValue(undefined);
    vi.mocked(generateRunMetadata).mockResolvedValue({
      title: "Image run",
      worktreeName: "feat/image",
    });

    const { result } = renderHook(() =>
      useWorkspaceHome({
        activeWorkspace: workspace,
        models,
        selectedModelId: "id-1",
        connectWorkspace,
        startThreadForWorkspace,
        sendUserMessageToThread,
      }),
    );

    await act(async () => {
      const started = await result.current.startRun(["img-1"]);
      expect(started).toBe(true);
    });

    expect(sendUserMessageToThread).toHaveBeenCalledWith(
      workspace,
      "thread-1",
      "",
      ["img-1"],
      expect.objectContaining({ model: "gpt-5.1-max" }),
    );
  });

  it("updates title after metadata resolves for local runs", async () => {
    const connectWorkspace = vi.fn().mockResolvedValue(undefined);
    const startThreadForWorkspace = vi.fn().mockResolvedValue("thread-1");
    const sendUserMessageToThread = vi.fn().mockResolvedValue(undefined);
    let resolveMetadata: (value: { title: string; worktreeName: string }) => void =
      () => {};
    vi.mocked(generateRunMetadata).mockReturnValue(
      new Promise((resolve) => {
        resolveMetadata = resolve;
      }),
    );

    const { result } = renderHook(() =>
      useWorkspaceHome({
        activeWorkspace: workspace,
        models,
        selectedModelId: "id-1",
        connectWorkspace,
        startThreadForWorkspace,
        sendUserMessageToThread,
      }),
    );

    act(() => {
      result.current.setDraft("Local prompt");
    });

    await act(async () => {
      await result.current.startRun();
    });

    expect(result.current.runs[0].title).toBe("Local prompt");

    await act(async () => {
      resolveMetadata({ title: "Meta title", worktreeName: "feat/meta" });
      await Promise.resolve();
    });

    expect(result.current.runs[0].title).toBe("Meta title");
  });
});
