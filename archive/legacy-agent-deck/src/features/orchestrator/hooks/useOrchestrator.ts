import { useCallback, useRef, useState } from "react";
import {
  orchestratorSend,
  startThread,
  sendUserMessage,
  getGitStatus,
} from "@services/tauri";
import type {
  OrchestratorConfig,
  OrchestratorTask,
  WorkspaceInfo,
} from "@/types";

export type OrchestratorChatEntry = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  tasks?: OrchestratorTask[];
};

type UseOrchestratorOptions = {
  workspaces: WorkspaceInfo[];
  activeWorkspace: WorkspaceInfo | null | undefined;
  orchestratorConfig: OrchestratorConfig | null;
  onSpawnThread?: (workspaceId: string, threadId: string) => void;
};

export function useOrchestrator({
  workspaces,
  activeWorkspace,
  orchestratorConfig,
  onSpawnThread,
}: UseOrchestratorOptions) {
  const [chatHistory, setChatHistory] = useState<OrchestratorChatEntry[]>([]);
  const [tasks, setTasks] = useState<OrchestratorTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const brainWorkspace =
    activeWorkspace?.connected
      ? activeWorkspace
      : workspaces.find((workspace) => workspace.connected);
  const isCodexProvider = orchestratorConfig?.provider === "codex";
  const hasCompatibleEndpointConfig = Boolean(
    orchestratorConfig?.baseUrl?.trim() &&
      orchestratorConfig.apiKey?.trim() &&
      orchestratorConfig.model?.trim(),
  );
  const isConfigured = isCodexProvider
    ? Boolean(orchestratorConfig && brainWorkspace)
    : hasCompatibleEndpointConfig;
  const configurationTitle = orchestratorConfig
    ? isCodexProvider && !brainWorkspace
      ? "Connect workspace"
      : "Not configured"
    : "Not configured";
  const configurationDescription = orchestratorConfig
    ? isCodexProvider && !brainWorkspace
      ? "Codex subscription is selected. Connect a workspace so the orchestrator can run through Codex."
      : "Add a base URL, API key, and model before using the orchestrator."
    : "Choose and save an orchestrator provider before using the panel.";

  const findWorkspace = useCallback(
    (name: string): WorkspaceInfo | undefined => {
      const lower = name.toLowerCase();
      return (
        workspaces.find((ws) => ws.name.toLowerCase() === lower) ??
        workspaces.find((ws) => ws.name.toLowerCase().includes(lower))
      );
    },
    [workspaces]
  );

  const updateTask = useCallback(
    (taskId: string, patch: Partial<OrchestratorTask>) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
      );
    },
    []
  );

  const executeToolCall = useCallback(
    async (
      name: string,
      args: Record<string, unknown>
    ): Promise<string> => {
      switch (name) {
        case "list_workspaces": {
          const names = workspaces.map((ws) => ({
            name: ws.name,
            path: ws.path,
            connected: ws.connected,
            active: ws.id === activeWorkspace?.id,
          }));
          return JSON.stringify({ workspaces: names });
        }

        case "spawn_agent": {
          const wsName = args.workspace_name as string;
          const task = args.task as string;
          const ws = findWorkspace(wsName);
          if (!ws) {
            return JSON.stringify({
              error: `Workspace "${wsName}" not found. Available: ${workspaces.map((w) => w.name).join(", ")}`,
            });
          }

          const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const newTask: OrchestratorTask = {
            id: taskId,
            workspaceName: ws.name,
            workspaceId: ws.id,
            threadId: null,
            task,
            status: "running",
            result: null,
            createdAt: Date.now(),
          };
          setTasks((prev) => [...prev, newTask]);

          try {
            const threadResult = await startThread(ws.id);
            const threadId = threadResult?.threadId ?? threadResult?.id;
            if (!threadId) {
              updateTask(taskId, { status: "failed", result: "Failed to start thread" });
              return JSON.stringify({ error: "Failed to start thread" });
            }
            updateTask(taskId, { threadId });
            onSpawnThread?.(ws.id, threadId);

            await sendUserMessage(ws.id, threadId, task, {
              accessMode: (args.access_mode as "read-only" | "current" | "full-access") ?? "current",
            });

            updateTask(taskId, { status: "running" });
            return JSON.stringify({
              taskId,
              threadId,
              workspaceName: ws.name,
              status: "running",
            });
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            updateTask(taskId, { status: "failed", result: errMsg });
            return JSON.stringify({ error: errMsg });
          }
        }

        case "check_agent_status": {
          const taskId = args.task_id as string;
          const found = tasks.find((t) => t.id === taskId);
          if (!found) {
            return JSON.stringify({ error: `Task ${taskId} not found` });
          }
          return JSON.stringify({
            taskId: found.id,
            status: found.status,
            result: found.result,
          });
        }

        case "send_followup": {
          const taskId = args.task_id as string;
          const message = args.message as string;
          const found = tasks.find((t) => t.id === taskId);
          if (!found || !found.threadId) {
            return JSON.stringify({ error: `Task ${taskId} not found or has no thread` });
          }
          try {
            await sendUserMessage(found.workspaceId, found.threadId, message);
            return JSON.stringify({ sent: true });
          } catch (err) {
            return JSON.stringify({ error: String(err) });
          }
        }

        case "verify_git_changes": {
          const wsName = args.workspace_name as string;
          const ws = findWorkspace(wsName);
          if (!ws) {
            return JSON.stringify({ error: `Workspace "${wsName}" not found` });
          }
          try {
            const status = await getGitStatus(ws.id);
            return JSON.stringify({
              branch: status.branchName,
              totalAdditions: status.totalAdditions,
              totalDeletions: status.totalDeletions,
              changedFiles: status.files.length,
              files: status.files.slice(0, 20).map((f) => ({
                path: f.path,
                status: f.status,
              })),
            });
          } catch (err) {
            return JSON.stringify({ error: String(err) });
          }
        }

        case "report_to_user": {
          const summary = args.summary as string;
          const status = args.status as string;
          return JSON.stringify({ acknowledged: true, summary, status });
        }

        default:
          return JSON.stringify({ error: `Unknown tool: ${name}` });
      }
    },
    [workspaces, activeWorkspace, findWorkspace, tasks, updateTask, onSpawnThread]
  );

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!isConfigured || isProcessing) return;

      setError(null);
      abortRef.current = false;

      const userEntry: OrchestratorChatEntry = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: userMessage,
        timestamp: Date.now(),
      };
      setChatHistory((prev) => [...prev, userEntry]);
      setIsProcessing(true);

      try {
        // Build message array for API
        const apiMessages: { role: string; content: string; tool_call_id?: string }[] = [];
        for (const entry of [...chatHistory, userEntry]) {
          apiMessages.push({ role: entry.role, content: entry.content });
        }

        let maxIterations = 15;
        let currentMessages = apiMessages;

        while (maxIterations > 0 && !abortRef.current) {
          maxIterations--;

          const response = await orchestratorSend(
            currentMessages,
            isCodexProvider ? brainWorkspace?.id ?? null : null,
          );

          if (response.error) {
            setError(response.error);
            break;
          }

          // If there are tool calls, execute them and feed results back
          if (response.toolCalls.length > 0) {
            // Add the assistant message with tool calls to the message list
            const assistantMsg = {
              role: "assistant" as const,
              content: response.message?.content ?? "",
            };
            currentMessages = [...currentMessages, assistantMsg];

            // Show assistant text if any
            if (response.message?.content) {
              const assistantEntry: OrchestratorChatEntry = {
                id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                role: "assistant",
                content: response.message.content,
                timestamp: Date.now(),
              };
              setChatHistory((prev) => [...prev, assistantEntry]);
            }

            for (const tc of response.toolCalls) {
              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(tc.function.arguments);
              } catch {
                /* empty */
              }
              const result = await executeToolCall(tc.function.name, args);

              currentMessages = [
                ...currentMessages,
                {
                  role: "tool",
                  content: result,
                  tool_call_id: tc.id,
                },
              ];
            }
            continue;
          }

          // No tool calls — this is a final text response
          if (response.message?.content) {
            const assistantEntry: OrchestratorChatEntry = {
              id: `msg-${Date.now()}-final`,
              role: "assistant",
              content: response.message.content,
              timestamp: Date.now(),
            };
            setChatHistory((prev) => [...prev, assistantEntry]);
          }
          break;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        setError(errMsg);
        const errorEntry: OrchestratorChatEntry = {
          id: `msg-err-${Date.now()}`,
          role: "system",
          content: `Error: ${errMsg}`,
          timestamp: Date.now(),
        };
        setChatHistory((prev) => [...prev, errorEntry]);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      isConfigured,
      isProcessing,
      chatHistory,
      executeToolCall,
      isCodexProvider,
      brainWorkspace?.id,
    ]
  );

  const clearChat = useCallback(() => {
    setChatHistory([]);
    setTasks([]);
    setError(null);
  }, []);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return {
    chatHistory,
    tasks,
    isProcessing,
    isConfigured,
    configurationTitle,
    configurationDescription,
    error,
    sendMessage,
    clearChat,
    abort,
  };
}
