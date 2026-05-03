import { useEffect, useMemo, useState } from "react";
import PlugZap from "lucide-react/dist/esm/icons/plug-zap";
import Save from "lucide-react/dist/esm/icons/save";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { openUrl } from "@tauri-apps/plugin-opener";
import type {
  AccountSnapshot,
  AppSettings,
  OrchestratorConfig,
  WorkspaceInfo,
} from "@/types";
import { orchestratorTestConnection, runCodexDeviceLogin } from "@services/tauri";
import {
  SettingsSection,
  SettingsSubsection,
} from "@/features/design-system/components/settings/SettingsPrimitives";

type SettingsOrchestratorSectionProps = {
  appSettings: AppSettings;
  onUpdateAppSettings: (next: AppSettings) => Promise<void>;
  activeWorkspace?: WorkspaceInfo | null;
  activeAccount?: AccountSnapshot | null;
  accountSwitching?: boolean;
  onSwitchCodexAccount?: () => Promise<void>;
  onCancelCodexAccountSwitch?: () => Promise<void>;
};

type OrchestratorDraft = {
  provider: "openai" | "codex" | "custom";
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  maxConcurrentAgents: string;
};

const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  provider: "openai",
  baseUrl: "https://api.openai.com/v1",
  apiKey: null,
  model: "gpt-4o-mini",
  systemPrompt: null,
  maxConcurrentAgents: 3,
};

function toDraft(config: OrchestratorConfig | null): OrchestratorDraft {
  const normalized = config ?? DEFAULT_ORCHESTRATOR_CONFIG;
  const provider =
    normalized.provider === "custom" || normalized.provider === "codex"
      ? normalized.provider
      : "openai";
  return {
    provider,
    baseUrl:
      provider === "codex"
        ? ""
        : normalized.baseUrl || DEFAULT_ORCHESTRATOR_CONFIG.baseUrl,
    apiKey: provider === "codex" ? "" : normalized.apiKey ?? "",
    model:
      provider === "codex"
        ? normalized.model || ""
        : normalized.model || DEFAULT_ORCHESTRATOR_CONFIG.model,
    systemPrompt: normalized.systemPrompt ?? "",
    maxConcurrentAgents: String(
      normalized.maxConcurrentAgents || DEFAULT_ORCHESTRATOR_CONFIG.maxConcurrentAgents,
    ),
  };
}

function clampMaxConcurrentAgents(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_ORCHESTRATOR_CONFIG.maxConcurrentAgents;
  }
  return Math.min(12, Math.max(1, parsed));
}

function toConfig(draft: OrchestratorDraft): OrchestratorConfig {
  if (draft.provider === "codex") {
    return {
      provider: "codex",
      baseUrl: "",
      apiKey: null,
      model: draft.model.trim(),
      systemPrompt: draft.systemPrompt.trim() || null,
      maxConcurrentAgents: clampMaxConcurrentAgents(draft.maxConcurrentAgents),
    };
  }
  return {
    provider: draft.provider,
    baseUrl: draft.baseUrl.trim(),
    apiKey: draft.apiKey.trim() || null,
    model: draft.model.trim(),
    systemPrompt: draft.systemPrompt.trim() || null,
    maxConcurrentAgents: clampMaxConcurrentAgents(draft.maxConcurrentAgents),
  };
}

export function SettingsOrchestratorSection({
  appSettings,
  onUpdateAppSettings,
  activeWorkspace,
  activeAccount,
  accountSwitching = false,
  onSwitchCodexAccount,
  onCancelCodexAccountSwitch,
}: SettingsOrchestratorSectionProps) {
  const [draft, setDraft] = useState(() => toDraft(appSettings.orchestratorConfig));
  const [testState, setTestState] = useState<
    { kind: "idle" | "testing" | "success" | "error"; message: string | null }
  >({ kind: "idle", message: null });
  const [deviceAuthState, setDeviceAuthState] = useState<
    { kind: "idle" | "testing" | "success" | "error"; message: string | null }
  >({ kind: "idle", message: null });
  const [deviceAuthBusy, setDeviceAuthBusy] = useState(false);

  useEffect(() => {
    setDraft(toDraft(appSettings.orchestratorConfig));
  }, [appSettings.orchestratorConfig]);

  const nextConfig = useMemo(() => toConfig(draft), [draft]);
  const isCodexProvider = draft.provider === "codex";
  const codexWorkspaceId = activeWorkspace?.connected ? activeWorkspace.id : null;
  const codexAccountLabel = activeAccount?.email
    ? `${activeAccount.email}${activeAccount.planType ? ` (${activeAccount.planType})` : ""}`
    : activeAccount?.type === "chatgpt"
      ? "ChatGPT account"
      : "Not signed in";
  const codexAuthBusy = accountSwitching || deviceAuthBusy;
  const canSave = isCodexProvider
    ? true
    : nextConfig.baseUrl.length > 0 &&
      nextConfig.model.length > 0 &&
      Boolean(nextConfig.apiKey);
  const canTest =
    testState.kind !== "testing" &&
    (isCodexProvider ? Boolean(codexWorkspaceId) : canSave);

  const updateDraft = (patch: Partial<OrchestratorDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setTestState({ kind: "idle", message: null });
  };

  const handleProviderChange = (provider: OrchestratorDraft["provider"]) => {
    updateDraft({
      provider,
      baseUrl:
        provider === "codex"
          ? ""
          : provider === "openai"
            ? DEFAULT_ORCHESTRATOR_CONFIG.baseUrl
            : draft.baseUrl,
      apiKey: provider === "codex" ? "" : draft.apiKey,
      model:
        provider === "codex"
          ? ""
          : provider === "openai" && !draft.model.trim()
            ? DEFAULT_ORCHESTRATOR_CONFIG.model
            : draft.model,
    });
  };

  const handleSave = async () => {
    if (!canSave) {
      setTestState({
        kind: "error",
        message: "Base URL, API key, and model are required.",
      });
      return;
    }
    await onUpdateAppSettings({
      ...appSettings,
      orchestratorConfig: nextConfig,
    });
    setTestState({ kind: "success", message: "Orchestrator settings saved." });
  };

  const persistCodexConfig = async () => {
    await onUpdateAppSettings({
      ...appSettings,
      orchestratorConfig: nextConfig,
    });
  };

  const handleClear = async () => {
    await onUpdateAppSettings({
      ...appSettings,
      orchestratorConfig: null,
    });
    setDraft(toDraft(null));
    setTestState({ kind: "idle", message: null });
  };

  const handleTestConnection = async () => {
    if (!canTest) {
      return;
    }
    setTestState({ kind: "testing", message: "Testing connection..." });
    try {
      const response = await orchestratorTestConnection(
        nextConfig,
        isCodexProvider ? codexWorkspaceId : null,
      );
      if (response.error) {
        setTestState({ kind: "error", message: response.error });
        return;
      }
      setTestState({ kind: "success", message: "Connection test succeeded." });
    } catch (error) {
      setTestState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleAuthorizeCodex = async () => {
    if (activeWorkspace?.connected && onSwitchCodexAccount) {
      await persistCodexConfig();
      await onSwitchCodexAccount();
      return;
    }
    setDeviceAuthBusy(true);
    setDeviceAuthState({ kind: "testing", message: "Starting Codex device auth..." });
    try {
      const result = await runCodexDeviceLogin();
      await persistCodexConfig();
      if (result.alreadyAuthenticated) {
        setDeviceAuthState({
          kind: "success",
          message: "Codex is already authorized",
        });
        return;
      }
      if (result.authUrl) {
        await openUrl(result.authUrl);
      }
      setDeviceAuthState({
        kind: "success",
        message: result.userCode
          ? `Opened Codex auth. Enter code ${result.userCode}`
          : "Opened Codex auth.",
      });
    } catch (error) {
      setDeviceAuthState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setDeviceAuthBusy(false);
    }
  };

  return (
    <SettingsSection
      title="Orchestrator"
      subtitle="Configure the model used by the right-side orchestrator panel."
    >
      <SettingsSubsection
        title="Connection"
        subtitle="Use either an OpenAI-compatible endpoint or your authenticated Codex subscription."
      />
      <div className="settings-field">
        <label className="settings-field-label" htmlFor="orchestrator-provider">
          Provider
        </label>
        <select
          id="orchestrator-provider"
          className="settings-select"
          value={draft.provider}
          onChange={(event) =>
            handleProviderChange(event.target.value as OrchestratorDraft["provider"])
          }
        >
          <option value="openai">OpenAI</option>
          <option value="codex">Codex subscription</option>
          <option value="custom">Custom compatible endpoint</option>
        </select>
      </div>

      {isCodexProvider ? (
        <div className="settings-field">
          <div className="settings-field-label">Codex account</div>
          <div className="settings-help">
            {activeWorkspace?.connected
              ? `${codexAccountLabel} via ${activeWorkspace.name}`
              : "Authorize Codex globally. Connect a workspace before testing or running the subscription orchestrator."}
          </div>
          <div className="settings-field-actions">
            <button
              type="button"
              className="ghost settings-button-compact"
              onClick={() => {
                void handleAuthorizeCodex();
              }}
              disabled={codexAuthBusy}
            >
              <PlugZap aria-hidden />
              {codexAuthBusy ? "Authorizing" : "Authorize"}
            </button>
            {activeWorkspace?.connected && onCancelCodexAccountSwitch && (
              <button
                type="button"
                className="ghost settings-button-compact"
                onClick={() => {
                  void onCancelCodexAccountSwitch();
                }}
                disabled={!accountSwitching}
              >
                Cancel
              </button>
            )}
          </div>
          {deviceAuthState.message && (
            <div
              className={`settings-help${
                deviceAuthState.kind === "error" ? " settings-help-error" : ""
              }`}
              role={deviceAuthState.kind === "error" ? "alert" : "status"}
            >
              {deviceAuthState.message}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="settings-field">
            <label className="settings-field-label" htmlFor="orchestrator-base-url">
              Base URL
            </label>
            <input
              id="orchestrator-base-url"
              className="settings-input"
              value={draft.baseUrl}
              onChange={(event) => updateDraft({ baseUrl: event.target.value })}
              placeholder="https://api.openai.com/v1"
            />
          </div>

          <div className="settings-field">
            <label className="settings-field-label" htmlFor="orchestrator-api-key">
              API key
            </label>
            <input
              id="orchestrator-api-key"
              className="settings-input"
              type="password"
              value={draft.apiKey}
              onChange={(event) => updateDraft({ apiKey: event.target.value })}
              autoComplete="off"
            />
          </div>
        </>
      )}

      <div className="settings-field">
        <label className="settings-field-label" htmlFor="orchestrator-model">
          {isCodexProvider ? "Model override" : "Model"}
        </label>
        <input
          id="orchestrator-model"
          className="settings-input"
          value={draft.model}
          onChange={(event) => updateDraft({ model: event.target.value })}
          placeholder={
            isCodexProvider ? "Use Codex default" : DEFAULT_ORCHESTRATOR_CONFIG.model
          }
        />
        {isCodexProvider && (
          <div className="settings-help">
            Leave blank to use the model configured in Codex.
          </div>
        )}
      </div>

      <div className="settings-field">
        <label className="settings-field-label" htmlFor="orchestrator-system-prompt">
          Additional instructions
        </label>
        <textarea
          id="orchestrator-system-prompt"
          className="settings-agents-textarea settings-agents-textarea--compact"
          value={draft.systemPrompt}
          onChange={(event) => updateDraft({ systemPrompt: event.target.value })}
        />
      </div>

      <div className="settings-field">
        <label className="settings-field-label" htmlFor="orchestrator-max-agents">
          Max concurrent agents
        </label>
        <input
          id="orchestrator-max-agents"
          className="settings-input settings-input--compact"
          type="number"
          min={1}
          max={12}
          value={draft.maxConcurrentAgents}
          onChange={(event) =>
            updateDraft({ maxConcurrentAgents: event.target.value })
          }
        />
        <div className="settings-help">Use a value from 1 to 12.</div>
      </div>

      <div className="settings-field-actions">
        <button
          type="button"
          className="primary settings-button-compact"
          onClick={handleSave}
          disabled={!canSave}
        >
          <Save aria-hidden />
          Save
        </button>
        <button
          type="button"
          className="ghost settings-button-compact"
          onClick={handleTestConnection}
          disabled={!canTest}
        >
          <PlugZap aria-hidden />
          {testState.kind === "testing" ? "Testing" : "Test connection"}
        </button>
        <button
          type="button"
          className="ghost settings-button-compact"
          onClick={handleClear}
          disabled={!appSettings.orchestratorConfig}
        >
          <Trash2 aria-hidden />
          Clear
        </button>
      </div>

      {testState.message && (
        <div
          className={`settings-help${
            testState.kind === "error" ? " settings-help-error" : ""
          }`}
          role={testState.kind === "error" ? "alert" : "status"}
        >
          {testState.message}
        </div>
      )}
    </SettingsSection>
  );
}
