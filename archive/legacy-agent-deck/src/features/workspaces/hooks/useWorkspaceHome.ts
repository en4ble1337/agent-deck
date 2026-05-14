import { useCallback, useMemo, useState } from "react";
import type {
  ModelOption,
  SendMessageResult,
  ServiceTier,
  WorkspaceInfo,
} from "../../../types";
import { generateRunMetadata } from "../../../services/tauri";

export type WorkspaceRunMode = "local" | "worktree";

export type WorkspaceHomeRunInstance = {
  id: string;
  workspaceId: string;
  threadId: string;
  modelId: string | null;
  modelLabel: string;
  sequence: number;
};

export type WorkspaceHomeRun = {
  id: string;
  workspaceId: string;
  title: string;
  prompt: string;
  createdAt: number;
  mode: WorkspaceRunMode;
  instances: WorkspaceHomeRunInstance[];
  status: "pending" | "ready" | "partial" | "failed";
  error: string | null;
  instanceErrors: Array<{ message: string }>;
};

type UseWorkspaceHomeOptions = {
  activeWorkspace: WorkspaceInfo | null;
  models: ModelOption[];
  selectedModelId: string | null;
  effort?: string | null;
  serviceTier?: ServiceTier | null | undefined;
  collaborationMode?: Record<string, unknown> | null;
  seedThreadCodexParams?: (
    workspaceId: string,
    threadId: string,
    patch: {
      modelId: string | null;
      effort: string | null;
      serviceTier: ServiceTier | null | undefined;
    },
  ) => void;
  connectWorkspace: (workspace: WorkspaceInfo) => Promise<void>;
  startThreadForWorkspace: (
    workspaceId: string,
    options?: { activate?: boolean },
  ) => Promise<string | null>;
  sendUserMessageToThread: (
    workspace: WorkspaceInfo,
    threadId: string,
    text: string,
    images?: string[],
    options?: {
      model?: string | null;
      effort?: string | null;
      serviceTier?: ServiceTier | null | undefined;
      collaborationMode?: Record<string, unknown> | null;
    },
  ) => Promise<void | SendMessageResult>;
};

type WorkspaceHomeState = {
  runsByWorkspace: Record<string, WorkspaceHomeRun[]>;
  draftsByWorkspace: Record<string, string>;
  modelSelectionsByWorkspace: Record<string, Record<string, number>>;
  errorByWorkspace: Record<string, string | null>;
  submittingByWorkspace: Record<string, boolean>;
};

const DEFAULT_MODE: WorkspaceRunMode = "local";
const EMPTY_SELECTIONS: Record<string, number> = {};
const MAX_TITLE_LENGTH = 56;

const createRunId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildRunTitle = (prompt: string) => {
  const firstLine = prompt.trim().split("\n")[0] ?? "";
  const normalized = firstLine.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "New run";
  }
  if (normalized.length > MAX_TITLE_LENGTH) {
    return `${normalized.slice(0, MAX_TITLE_LENGTH)}...`;
  }
  return normalized;
};

const resolveModelLabel = (model: ModelOption | null, fallback: string) =>
  model?.displayName?.trim() || model?.model?.trim() || fallback;

export function useWorkspaceHome({
  activeWorkspace,
  models,
  selectedModelId,
  effort = null,
  serviceTier = undefined,
  collaborationMode = null,
  seedThreadCodexParams,
  connectWorkspace,
  startThreadForWorkspace,
  sendUserMessageToThread,
}: UseWorkspaceHomeOptions) {
  const [state, setState] = useState<WorkspaceHomeState>({
    runsByWorkspace: {},
    draftsByWorkspace: {},
    modelSelectionsByWorkspace: {},
    errorByWorkspace: {},
    submittingByWorkspace: {},
  });

  const activeWorkspaceId = activeWorkspace?.id ?? null;
  const runs = activeWorkspaceId ? state.runsByWorkspace[activeWorkspaceId] ?? [] : [];
  const draft = activeWorkspaceId ? state.draftsByWorkspace[activeWorkspaceId] ?? "" : "";
  const runMode = DEFAULT_MODE;
  const modelSelections = useMemo(() => {
    if (!activeWorkspaceId) {
      return EMPTY_SELECTIONS;
    }
    return state.modelSelectionsByWorkspace[activeWorkspaceId] ?? EMPTY_SELECTIONS;
  }, [activeWorkspaceId, state.modelSelectionsByWorkspace]);
  const error = activeWorkspaceId ? state.errorByWorkspace[activeWorkspaceId] ?? null : null;
  const isSubmitting = activeWorkspaceId
    ? state.submittingByWorkspace[activeWorkspaceId] ?? false
    : false;

  const modelLookup = useMemo(() => {
    const map = new Map<string, ModelOption>();
    models.forEach((model) => {
      map.set(model.id, model);
    });
    return map;
  }, [models]);

  const setDraft = useCallback(
    (value: string) => {
      if (!activeWorkspaceId) {
        return;
      }
      setState((prev) => ({
        ...prev,
        draftsByWorkspace: { ...prev.draftsByWorkspace, [activeWorkspaceId]: value },
        errorByWorkspace: { ...prev.errorByWorkspace, [activeWorkspaceId]: null },
      }));
    },
    [activeWorkspaceId],
  );

  const setRunMode = useCallback(
    (_mode: WorkspaceRunMode) => {
      if (!activeWorkspaceId) {
        return;
      }
      setState((prev) => ({
        ...prev,
        errorByWorkspace: { ...prev.errorByWorkspace, [activeWorkspaceId]: null },
      }));
    },
    [activeWorkspaceId],
  );

  const toggleModelSelection = useCallback(
    (modelId: string) => {
      if (!activeWorkspaceId) {
        return;
      }
      setState((prev) => {
        const current = prev.modelSelectionsByWorkspace[activeWorkspaceId] ?? {};
        const next = { ...current };
        if (next[modelId]) {
          delete next[modelId];
        } else {
          next[modelId] = 1;
        }
        return {
          ...prev,
          modelSelectionsByWorkspace: {
            ...prev.modelSelectionsByWorkspace,
            [activeWorkspaceId]: next,
          },
          errorByWorkspace: { ...prev.errorByWorkspace, [activeWorkspaceId]: null },
        };
      });
    },
    [activeWorkspaceId],
  );

  const setModelCount = useCallback(
    (modelId: string, count: number) => {
      if (!activeWorkspaceId) {
        return;
      }
      setState((prev) => {
        const current = prev.modelSelectionsByWorkspace[activeWorkspaceId] ?? {};
        const next = { ...current, [modelId]: Math.max(1, count) };
        return {
          ...prev,
          modelSelectionsByWorkspace: {
            ...prev.modelSelectionsByWorkspace,
            [activeWorkspaceId]: next,
          },
          errorByWorkspace: { ...prev.errorByWorkspace, [activeWorkspaceId]: null },
        };
      });
    },
    [activeWorkspaceId],
  );

  const setWorkspaceError = useCallback(
    (message: string | null) => {
      if (!activeWorkspaceId) {
        return;
      }
      setState((prev) => ({
        ...prev,
        errorByWorkspace: { ...prev.errorByWorkspace, [activeWorkspaceId]: message },
      }));
    },
    [activeWorkspaceId],
  );

  const setSubmitting = useCallback(
    (value: boolean) => {
      if (!activeWorkspaceId) {
        return;
      }
      setState((prev) => ({
        ...prev,
        submittingByWorkspace: {
          ...prev.submittingByWorkspace,
          [activeWorkspaceId]: value,
        },
      }));
    },
    [activeWorkspaceId],
  );

  const updateRunState = useCallback(
    (
      workspaceId: string,
      runId: string,
      updates: Partial<WorkspaceHomeRun>,
    ) => {
      setState((prev) => {
        const runsForWorkspace = prev.runsByWorkspace[workspaceId] ?? [];
        return {
          ...prev,
          runsByWorkspace: {
            ...prev.runsByWorkspace,
            [workspaceId]: runsForWorkspace.map((run) =>
              run.id === runId ? { ...run, ...updates } : run,
            ),
          },
        };
      });
    },
    [],
  );

  const updateRunTitle = useCallback(
    (workspaceId: string, runId: string, title: string) => {
      setState((prev) => {
        const runsForWorkspace = prev.runsByWorkspace[workspaceId] ?? [];
        return {
          ...prev,
          runsByWorkspace: {
            ...prev.runsByWorkspace,
            [workspaceId]: runsForWorkspace.map((run) =>
              run.id === runId ? { ...run, title } : run,
            ),
          },
        };
      });
    },
    [],
  );

  const startRun = useCallback(async (images: string[] = []) => {
    if (!activeWorkspaceId || !activeWorkspace) {
      return false;
    }
    const prompt = draft.trim();
    const hasImages = images.length > 0;
    if ((!prompt && !hasImages) || isSubmitting) {
      return false;
    }

    setSubmitting(true);
    setWorkspaceError(null);

    const runId = createRunId();
    const fallbackTitle = buildRunTitle(prompt);
    const run: WorkspaceHomeRun = {
      id: runId,
      workspaceId: activeWorkspaceId,
      title: fallbackTitle,
      prompt,
      createdAt: Date.now(),
      mode: runMode,
      instances: [],
      status: "pending",
      error: null,
      instanceErrors: [],
    };

    setState((prev) => ({
      ...prev,
      runsByWorkspace: {
        ...prev.runsByWorkspace,
        [activeWorkspaceId]: [run, ...(prev.runsByWorkspace[activeWorkspaceId] ?? [])],
      },
      draftsByWorkspace: { ...prev.draftsByWorkspace, [activeWorkspaceId]: "" },
    }));

    void generateRunMetadata(activeWorkspace.id, prompt)
      .then((metadata) => {
        if (!metadata?.title) {
          return;
        }
        const nextTitle = metadata.title.trim();
        if (nextTitle && nextTitle !== fallbackTitle) {
          updateRunTitle(activeWorkspaceId, runId, nextTitle);
        }
      })
      .catch(() => {
        // Metadata is best-effort for local runs.
      });

    const instances: WorkspaceHomeRunInstance[] = [];
    let runError: string | null = null;
    const instanceErrors: Array<{ message: string }> = [];
    try {
      try {
        if (!activeWorkspace.connected) {
          await connectWorkspace(activeWorkspace);
        }
        const threadId = await startThreadForWorkspace(activeWorkspace.id, {
          activate: false,
        });
        if (!threadId) {
          throw new Error("Failed to start a local thread.");
        }
        seedThreadCodexParams?.(activeWorkspace.id, threadId, {
          modelId: selectedModelId,
          effort,
          serviceTier,
        });
        const localModel = selectedModelId
          ? modelLookup.get(selectedModelId)?.model ?? null
          : null;
        await sendUserMessageToThread(activeWorkspace, threadId, prompt, images, {
          model: localModel,
          effort,
          serviceTier,
          collaborationMode,
        });
        const model = selectedModelId ? modelLookup.get(selectedModelId) ?? null : null;
        instances.push({
          id: `${runId}-local-1`,
          workspaceId: activeWorkspace.id,
          threadId,
          modelId: selectedModelId ?? null,
          modelLabel: resolveModelLabel(model, "Default model"),
          sequence: 1,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        runError = message;
        instanceErrors.push({ message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      runError ??= message;
    } finally {
      let status: WorkspaceHomeRun["status"] = "ready";
      if (instances.length === 0) {
        runError ??= "Failed to start any instances.";
        status = "failed";
      } else if (runError) {
        status = "partial";
      }
      updateRunState(activeWorkspaceId, runId, {
        instances,
        status,
        error: runError,
        instanceErrors,
      });
      if (runError && status === "failed") {
        setWorkspaceError(runError);
      }
      setSubmitting(false);
    }
    return true;
  }, [
    activeWorkspace,
    activeWorkspaceId,
    collaborationMode,
    connectWorkspace,
    draft,
    effort,
    isSubmitting,
    modelLookup,
    updateRunState,
    runMode,
    seedThreadCodexParams,
    selectedModelId,
    serviceTier,
    sendUserMessageToThread,
    setSubmitting,
    setWorkspaceError,
    startThreadForWorkspace,
    updateRunTitle,
  ]);

  return {
    runs,
    draft,
    runMode,
    modelSelections,
    error,
    isSubmitting,
    setDraft,
    setRunMode,
    toggleModelSelection,
    setModelCount,
    startRun,
  };
}
