use serde_json::Value;
use tauri::{AppHandle, Emitter, State};

use crate::backend::events::AppServerEvent;
use crate::shared::codex_aux_core;
use crate::shared::orchestrator_core::{self, OrchestratorConfig};
use crate::state::AppState;

#[tauri::command]
pub(crate) async fn orchestrator_send(
    state: State<'_, AppState>,
    app: AppHandle,
    messages: Vec<Value>,
    workspace_id: Option<String>,
) -> Result<Value, String> {
    let settings = state.app_settings.lock().await;
    let config = settings.orchestrator_config.clone().unwrap_or_default();
    drop(settings);

    let response = if orchestrator_core::is_codex_provider(&config.provider) {
        let workspace_id = workspace_id
            .filter(|value| !value.trim().is_empty())
            .ok_or_else(|| {
                "Connect a workspace before using the Codex subscription orchestrator.".to_string()
            })?;
        let prompt = orchestrator_core::build_codex_orchestrator_prompt(&config, &messages);
        let model = config.model.trim();
        let model = if model.is_empty() { None } else { Some(model) };
        let raw = codex_aux_core::run_background_prompt_core(
            &state.sessions,
            &state.workspaces,
            workspace_id,
            prompt,
            model,
            |workspace_id, thread_id| {
                let _ = app.emit(
                    "app-server-event",
                    AppServerEvent {
                        workspace_id: workspace_id.to_string(),
                        message: serde_json::json!({
                            "method": "codex/backgroundThread",
                            "params": {
                                "threadId": thread_id,
                                "action": "hide"
                            }
                        }),
                    },
                );
            },
            "Timeout waiting for Codex subscription orchestrator",
            "Unknown error during Codex subscription orchestration",
        )
        .await?;
        orchestrator_core::parse_codex_orchestrator_response(&raw)?
    } else {
        orchestrator_core::send_orchestrator_chat(&config, messages).await?
    };
    serde_json::to_value(response).map_err(|err| format!("serialize error: {err}"))
}

#[tauri::command]
pub(crate) async fn orchestrator_test_connection(
    config: OrchestratorConfig,
    workspace_id: Option<String>,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<Value, String> {
    let test_messages = vec![serde_json::json!({
        "role": "user",
        "content": "Reply with exactly OK as the final answer. Do not call tools."
    })];

    let mut test_config = config;
    // For the test, use a minimal system prompt
    test_config.system_prompt = Some("Reply with exactly OK.".to_string());

    let response = if orchestrator_core::is_codex_provider(&test_config.provider) {
        let workspace_id = workspace_id
            .filter(|value| !value.trim().is_empty())
            .ok_or_else(|| {
                "Connect a workspace before testing Codex subscription auth.".to_string()
            })?;
        let prompt =
            orchestrator_core::build_codex_orchestrator_prompt(&test_config, &test_messages);
        let model = test_config.model.trim();
        let model = if model.is_empty() { None } else { Some(model) };
        let raw = codex_aux_core::run_background_prompt_core(
            &state.sessions,
            &state.workspaces,
            workspace_id,
            prompt,
            model,
            |workspace_id, thread_id| {
                let _ = app.emit(
                    "app-server-event",
                    AppServerEvent {
                        workspace_id: workspace_id.to_string(),
                        message: serde_json::json!({
                            "method": "codex/backgroundThread",
                            "params": {
                                "threadId": thread_id,
                                "action": "hide"
                            }
                        }),
                    },
                );
            },
            "Timeout waiting for Codex subscription orchestrator test",
            "Unknown error during Codex subscription orchestrator test",
        )
        .await?;
        orchestrator_core::parse_codex_orchestrator_response(&raw)?
    } else {
        orchestrator_core::send_orchestrator_chat(&test_config, test_messages).await?
    };
    serde_json::to_value(response).map_err(|err| format!("serialize error: {err}"))
}
