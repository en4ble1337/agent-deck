use tauri::State;

use crate::{
    models::{Workspace, WorkspacePatch},
    state::AppState,
};

#[tauri::command]
pub async fn workspace_list(state: State<'_, AppState>) -> Result<Vec<Workspace>, String> {
    let storage = state.storage.lock().await;
    Ok(storage.list_workspaces())
}

#[tauri::command]
pub async fn workspace_add(path: String, state: State<'_, AppState>) -> Result<Workspace, String> {
    let mut storage = state.storage.lock().await;
    storage.add_workspace(path)
}

#[tauri::command]
pub async fn workspace_update(
    id: String,
    patch: WorkspacePatch,
    state: State<'_, AppState>,
) -> Result<Workspace, String> {
    let mut storage = state.storage.lock().await;
    storage.update_workspace(&id, patch)
}

#[tauri::command]
pub async fn workspace_close(id: String, state: State<'_, AppState>) -> Result<Workspace, String> {
    state.terminals.stop_workspace_sessions(&id).await?;
    let mut storage = state.storage.lock().await;
    storage.close_workspace(&id)
}

#[tauri::command]
pub async fn workspace_remove(
    id: String,
    remove_history: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.terminals.stop_workspace_sessions(&id).await?;
    let mut storage = state.storage.lock().await;
    storage.remove_workspace(&id, remove_history)
}
