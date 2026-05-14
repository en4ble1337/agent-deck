mod commands;
mod core;
mod models;
mod state;

use std::sync::Arc;

use core::{storage::Storage, terminal::TerminalManager};
use state::AppState;
use tauri::Manager;
use tokio::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            let storage = Arc::new(Mutex::new(Storage::load(data_dir.clone())?));
            let terminals = TerminalManager::new(app.handle().clone(), Arc::clone(&storage));
            app.manage(AppState { storage, terminals });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::workspaces::workspace_list,
            commands::workspaces::workspace_add,
            commands::workspaces::workspace_update,
            commands::workspaces::workspace_close,
            commands::workspaces::workspace_remove,
            commands::presets::preset_list,
            commands::sessions::session_list,
            commands::sessions::session_create,
            commands::sessions::session_start,
            commands::sessions::session_write,
            commands::sessions::session_save_attachment,
            commands::sessions::session_resize,
            commands::sessions::session_stop,
            commands::sessions::session_restart,
            commands::sessions::session_archive,
            commands::sessions::session_unarchive,
            commands::sessions::session_delete,
            commands::sessions::session_read_transcript,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Workspace Deck");
}
