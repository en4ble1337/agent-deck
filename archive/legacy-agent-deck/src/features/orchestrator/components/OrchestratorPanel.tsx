import { useCallback, useEffect, useRef, useState } from "react";
import Bot from "lucide-react/dist/esm/icons/bot";
import SendHorizontal from "lucide-react/dist/esm/icons/send-horizontal";
import Settings from "lucide-react/dist/esm/icons/settings";
import Square from "lucide-react/dist/esm/icons/square";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import X from "lucide-react/dist/esm/icons/x";
import Zap from "lucide-react/dist/esm/icons/zap";
import type { OrchestratorConfig, WorkspaceInfo } from "@/types";
import {
  useOrchestrator,
  type OrchestratorChatEntry,
} from "../hooks/useOrchestrator";

type OrchestratorPanelProps = {
  workspaces: WorkspaceInfo[];
  activeWorkspace: WorkspaceInfo | null | undefined;
  orchestratorConfig: OrchestratorConfig | null;
  onSpawnThread?: (workspaceId: string, threadId: string) => void;
  onOpenSettings?: () => void;
  onClose?: () => void;
};

const PROVIDER_LABELS: Record<OrchestratorConfig["provider"], string> = {
  openai: "OpenAI",
  codex: "Codex subscription",
  anthropic: "Anthropic",
  ollama: "Ollama",
  custom: "Custom",
};

export function OrchestratorPanel({
  workspaces,
  activeWorkspace,
  orchestratorConfig,
  onSpawnThread,
  onOpenSettings,
  onClose,
}: OrchestratorPanelProps) {
  const {
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
  } = useOrchestrator({
    workspaces,
    activeWorkspace,
    orchestratorConfig,
    onSpawnThread,
  });

  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [chatHistory.length, isProcessing]);

  useEffect(() => {
    if (isConfigured) {
      inputRef.current?.focus();
    }
  }, [isConfigured]);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isProcessing) return;
    setInputValue("");
    void sendMessage(trimmed);
  }, [inputValue, isProcessing, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const providerLabel = orchestratorConfig
    ? PROVIDER_LABELS[orchestratorConfig.provider]
    : "Offline";
  const modelLabel =
    orchestratorConfig?.model?.trim() ||
    (orchestratorConfig?.provider === "codex" ? "Codex default" : "No model");

  return (
    <div className="orchestrator-panel">
      <div className="orchestrator-header">
        <div className="orchestrator-title-block">
          <span className="orchestrator-title-icon">
            <Bot aria-hidden />
          </span>
          <div>
            <div className="orchestrator-title">Orchestrator</div>
            <div className="orchestrator-subtitle">
              {isConfigured
                ? `${providerLabel} - ${modelLabel}`
                : configurationTitle}
            </div>
          </div>
        </div>
        <div className="orchestrator-header-actions">
          {isConfigured && onOpenSettings && (
            <button
              type="button"
              className="orchestrator-action-btn"
              onClick={onOpenSettings}
              title="Orchestrator settings"
              aria-label="Orchestrator settings"
            >
              <Settings aria-hidden />
            </button>
          )}
          {isProcessing && (
            <button
              type="button"
              className="orchestrator-action-btn orchestrator-stop-btn"
              onClick={abort}
              title="Stop"
              aria-label="Stop orchestrator"
            >
              <Square aria-hidden />
            </button>
          )}
          {isConfigured && (
            <button
              type="button"
              className="orchestrator-action-btn"
              onClick={clearChat}
              title="Clear chat"
              aria-label="Clear orchestrator chat"
              disabled={isProcessing}
            >
              <Trash2 aria-hidden />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              className="orchestrator-action-btn"
              onClick={onClose}
              title="Close"
              aria-label="Close orchestrator"
            >
              <X aria-hidden />
            </button>
          )}
        </div>
      </div>

      {!isConfigured ? (
        <div className="orchestrator-empty">
          <div className="orchestrator-empty-icon">
            <Zap aria-hidden />
          </div>
          <p className="orchestrator-empty-title">{configurationTitle}</p>
          <p className="orchestrator-empty-desc">
            {configurationDescription}
          </p>
          {onOpenSettings && (
            <button
              type="button"
              className="orchestrator-configure-btn"
              onClick={onOpenSettings}
            >
              <Settings aria-hidden />
              Configure
            </button>
          )}
        </div>
      ) : (
        <>
          {tasks.length > 0 && (
            <div className="orchestrator-tasks">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`orchestrator-task orchestrator-task-${task.status}`}
                  title={task.status}
                >
                  <span className="orchestrator-task-icon" aria-hidden />
                  <span className="orchestrator-task-workspace">
                    {task.workspaceName}
                  </span>
                  <span className="orchestrator-task-desc">
                    {task.task.length > 60
                      ? `${task.task.slice(0, 60)}...`
                      : task.task}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="orchestrator-messages" ref={scrollRef}>
            {chatHistory.length === 0 && !isProcessing && (
              <div className="orchestrator-welcome">
                <p>Ask for a cross-workspace task and I will coordinate the agents.</p>
                <div className="orchestrator-suggestions">
                  <button
                    type="button"
                    className="orchestrator-suggestion"
                    onClick={() =>
                      void sendMessage(
                        "List all available workspaces and their status",
                      )
                    }
                  >
                    List workspaces
                  </button>
                  <button
                    type="button"
                    className="orchestrator-suggestion"
                    onClick={() =>
                      void sendMessage(
                        "Run tests in the current workspace and fix any failures",
                      )
                    }
                  >
                    Run and fix tests
                  </button>
                  <button
                    type="button"
                    className="orchestrator-suggestion"
                    onClick={() =>
                      void sendMessage(
                        "Check git status across all workspaces and summarize changes",
                      )
                    }
                  >
                    Git status check
                  </button>
                </div>
              </div>
            )}
            {chatHistory.map((entry) => (
              <ChatMessage key={entry.id} entry={entry} />
            ))}
            {isProcessing && (
              <div className="orchestrator-msg orchestrator-msg-system">
                <div className="orchestrator-thinking">
                  <span className="orchestrator-thinking-dot" />
                  <span className="orchestrator-thinking-dot" />
                  <span className="orchestrator-thinking-dot" />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="orchestrator-error">
              <span>{error}</span>
            </div>
          )}

          <div className="orchestrator-composer">
            <textarea
              ref={inputRef}
              className="orchestrator-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell the orchestrator what to do..."
              rows={2}
              disabled={isProcessing}
            />
            <button
              type="button"
              className="orchestrator-send-btn"
              onClick={handleSend}
              disabled={isProcessing || !inputValue.trim()}
              title="Send"
              aria-label="Send orchestrator message"
            >
              <SendHorizontal aria-hidden />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ChatMessage({ entry }: { entry: OrchestratorChatEntry }) {
  return (
    <div className={`orchestrator-msg orchestrator-msg-${entry.role}`}>
      <div className="orchestrator-msg-content">
        {entry.content.split("\n").map((line, i) => (
          <p key={i}>{line || "\u00A0"}</p>
        ))}
      </div>
    </div>
  );
}
