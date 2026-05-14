use tauri::State;

use crate::{models::CommandPreset, state::AppState};

#[tauri::command]
pub async fn preset_list(
    workspace_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<CommandPreset>, String> {
    let storage = state.storage.lock().await;
    Ok(storage.list_presets(workspace_id.as_deref()))
}
