use tauri::State;

use crate::{
    models::{SessionCreateRequest, SessionStatus, SessionView},
    state::AppState,
};

#[tauri::command]
pub async fn session_list(
    workspace_id: Option<String>,
    include_archived: Option<bool>,
    state: State<'_, AppState>,
) -> Result<Vec<SessionView>, String> {
    let live_ids = state.terminals.live_session_ids().await;
    let storage = state.storage.lock().await;
    Ok(storage.list_sessions(
        workspace_id.as_deref(),
        include_archived.unwrap_or(false),
        &live_ids,
    ))
}

#[tauri::command]
pub async fn session_create(
    request: SessionCreateRequest,
    state: State<'_, AppState>,
) -> Result<SessionView, String> {
    let mut storage = state.storage.lock().await;
    let session = storage.create_session(request)?;
    storage.session_view(&session.id, false)
}

#[tauri::command]
pub async fn session_start(
    session_id: String,
    cols: u16,
    rows: u16,
    state: State<'_, AppState>,
) -> Result<SessionView, String> {
    let session = {
        let storage = state.storage.lock().await;
        storage.get_session(&session_id)?
    };
    state.terminals.start_session(session, cols, rows).await?;
    let has_process = state.terminals.has_process(&session_id).await;
    let storage = state.storage.lock().await;
    storage.session_view(&session_id, has_process)
}

#[tauri::command]
pub async fn session_write(
    session_id: String,
    data: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.terminals.write(&session_id, data).await
}

#[tauri::command]
pub async fn session_resize(
    session_id: String,
    cols: u16,
    rows: u16,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.terminals.resize(&session_id, cols, rows).await
}

#[tauri::command]
pub async fn session_stop(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<SessionView, String> {
    state.terminals.stop_session(&session_id).await?;
    let storage = state.storage.lock().await;
    storage.session_view(&session_id, false)
}

#[tauri::command]
pub async fn session_restart(
    session_id: String,
    cols: u16,
    rows: u16,
    state: State<'_, AppState>,
) -> Result<SessionView, String> {
    state.terminals.stop_session(&session_id).await?;
    {
        let mut storage = state.storage.lock().await;
        let _ = storage.update_session_status(&session_id, SessionStatus::Created, None)?;
    }
    session_start(session_id, cols, rows, state).await
}

#[tauri::command]
pub async fn session_archive(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<SessionView, String> {
    state.terminals.stop_session(&session_id).await?;
    let mut storage = state.storage.lock().await;
    storage.archive_session(&session_id, true)
}

#[tauri::command]
pub async fn session_unarchive(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<SessionView, String> {
    let mut storage = state.storage.lock().await;
    storage.archive_session(&session_id, false)
}

#[tauri::command]
pub async fn session_delete(
    session_id: String,
    delete_transcript: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.terminals.stop_session(&session_id).await?;
    let mut storage = state.storage.lock().await;
    storage.delete_session(&session_id, delete_transcript)
}

#[tauri::command]
pub async fn session_read_transcript(
    session_id: String,
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let storage = state.storage.lock().await;
    let session = storage.get_session(&session_id)?;
    Ok(storage.read_transcript_tail(&session.transcript_path, limit.unwrap_or(200_000)))
}
