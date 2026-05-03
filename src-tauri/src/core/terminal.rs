use std::{
    collections::HashMap,
    fs::OpenOptions,
    io::{Read, Write},
    path::PathBuf,
    sync::Arc,
};

use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

use crate::{
    core::storage::{now_ms, SharedStorage},
    models::{SessionKind, SessionOutputEvent, SessionStatus, SessionStatusEvent, TerminalSession},
};

struct LiveTerminal {
    session_id: String,
    workspace_id: String,
    master: Mutex<Box<dyn MasterPty + Send>>,
    writer: Mutex<Box<dyn Write + Send>>,
    child: Mutex<Box<dyn Child + Send>>,
}

pub struct TerminalManager {
    app: AppHandle,
    storage: SharedStorage,
    live: Arc<Mutex<HashMap<String, Arc<LiveTerminal>>>>,
}

impl TerminalManager {
    pub fn new(app: AppHandle, storage: SharedStorage) -> Self {
        Self {
            app,
            storage,
            live: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn live_session_ids(&self) -> Vec<String> {
        self.live.lock().await.keys().cloned().collect()
    }

    pub async fn has_process(&self, session_id: &str) -> bool {
        self.live.lock().await.contains_key(session_id)
    }

    pub async fn start_session(
        &self,
        session: TerminalSession,
        cols: u16,
        rows: u16,
    ) -> Result<(), String> {
        if self.has_process(&session.id).await {
            return Ok(());
        }

        self.set_status(&session.id, SessionStatus::Starting, None)
            .await?;

        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: rows.max(2),
                cols: cols.max(2),
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|error| format!("Failed to open pty: {error}"))?;

        let mut command = build_command(&session);
        command.cwd(PathBuf::from(&session.cwd));
        command.env("TERM", "xterm-256color");
        let locale = resolve_locale();
        command.env("LANG", &locale);
        command.env("LC_ALL", &locale);
        command.env("LC_CTYPE", &locale);

        let child = match pair.slave.spawn_command(command) {
            Ok(child) => child,
            Err(error) => {
                let _ = self
                    .set_status(&session.id, SessionStatus::Failed, Some(1))
                    .await;
                return Err(format!("Failed to spawn session: {error}"));
            }
        };
        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|error| format!("Failed to open pty reader: {error}"))?;
        let writer = pair
            .master
            .take_writer()
            .map_err(|error| format!("Failed to open pty writer: {error}"))?;

        let live = Arc::new(LiveTerminal {
            session_id: session.id.clone(),
            workspace_id: session.workspace_id.clone(),
            master: Mutex::new(pair.master),
            writer: Mutex::new(writer),
            child: Mutex::new(child),
        });

        {
            let mut live_sessions = self.live.lock().await;
            if live_sessions.contains_key(&session.id) {
                return Ok(());
            }
            live_sessions.insert(session.id.clone(), Arc::clone(&live));
        }

        self.set_status(&session.id, SessionStatus::Running, None)
            .await?;
        spawn_reader(
            self.app.clone(),
            Arc::clone(&self.storage),
            Arc::clone(&self.live),
            live,
            session,
            reader,
        );
        Ok(())
    }

    pub async fn write(&self, session_id: &str, data: String) -> Result<(), String> {
        let live = self
            .live
            .lock()
            .await
            .get(session_id)
            .cloned()
            .ok_or_else(|| "Session is not running".to_string())?;
        let session_id = session_id.to_string();
        let result = tauri::async_runtime::spawn_blocking(move || {
            let mut writer = live.writer.blocking_lock();
            writer
                .write_all(data.as_bytes())
                .map_err(|error| format!("Failed to write to pty: {error}"))?;
            writer
                .flush()
                .map_err(|error| format!("Failed to flush pty: {error}"))?;
            Ok::<(), String>(())
        })
        .await
        .map_err(|error| format!("Terminal write task failed: {error}"))?;

        if let Err(error) = result {
            if is_closed_error(&error) {
                self.live.lock().await.remove(&session_id);
            }
            return Err(error);
        }
        Ok(())
    }

    pub async fn resize(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let live = self
            .live
            .lock()
            .await
            .get(session_id)
            .cloned()
            .ok_or_else(|| "Session is not running".to_string())?;
        let session_id = session_id.to_string();
        let result = tauri::async_runtime::spawn_blocking(move || {
            let master = live.master.blocking_lock();
            master
                .resize(PtySize {
                    rows: rows.max(2),
                    cols: cols.max(2),
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|error| format!("Failed to resize pty: {error}"))
        })
        .await
        .map_err(|error| format!("Terminal resize task failed: {error}"))?;

        if let Err(error) = result {
            if is_closed_error(&error) {
                self.live.lock().await.remove(&session_id);
            }
            return Err(error);
        }
        Ok(())
    }

    pub async fn stop_session(&self, session_id: &str) -> Result<(), String> {
        let live = self.live.lock().await.remove(session_id);
        if let Some(live) = live {
            let session_id = live.session_id.clone();
            let _ = tauri::async_runtime::spawn_blocking(move || {
                let mut child = live.child.blocking_lock();
                let _ = child.kill();
            })
            .await;
            let _ = self
                .set_status(&session_id, SessionStatus::Exited, None)
                .await;
        }
        Ok(())
    }

    pub async fn stop_workspace_sessions(&self, workspace_id: &str) -> Result<(), String> {
        let session_ids: Vec<String> = {
            let live = self.live.lock().await;
            live.values()
                .filter(|session| session.workspace_id == workspace_id)
                .map(|session| session.session_id.clone())
                .collect()
        };
        for session_id in session_ids {
            self.stop_session(&session_id).await?;
        }
        Ok(())
    }

    async fn set_status(
        &self,
        session_id: &str,
        status: SessionStatus,
        exit_code: Option<i32>,
    ) -> Result<(), String> {
        let mut storage = self.storage.lock().await;
        let session = storage.update_session_status(session_id, status.clone(), exit_code)?;
        let _ = self.app.emit(
            "session/status",
            SessionStatusEvent {
                session_id: session.id,
                workspace_id: session.workspace_id,
                status,
                exit_code,
            },
        );
        Ok(())
    }
}

fn spawn_reader(
    app: AppHandle,
    storage: SharedStorage,
    live_sessions: Arc<Mutex<HashMap<String, Arc<LiveTerminal>>>>,
    live: Arc<LiveTerminal>,
    session: TerminalSession,
    mut reader: Box<dyn Read + Send>,
) {
    std::thread::spawn(move || {
        let mut transcript = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&session.transcript_path)
            .ok();
        let mut buffer = [0u8; 8192];
        let mut pending = Vec::new();
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(count) => {
                    pending.extend_from_slice(&buffer[..count]);
                    for chunk in drain_utf8_chunks(&mut pending) {
                        if let Some(file) = transcript.as_mut() {
                            let _ = file.write_all(chunk.as_bytes());
                        }
                        let _ = app.emit(
                            "session/output",
                            SessionOutputEvent {
                                session_id: session.id.clone(),
                                workspace_id: session.workspace_id.clone(),
                                data: chunk,
                            },
                        );
                        let storage = Arc::clone(&storage);
                        let session_id = session.id.clone();
                        tauri::async_runtime::spawn(async move {
                            let mut storage = storage.lock().await;
                            let _ = storage.touch_session(&session_id);
                        });
                    }
                }
                Err(_) => break,
            }
        }

        let app_for_cleanup = app.clone();
        let storage_for_cleanup = Arc::clone(&storage);
        let session_id = session.id.clone();
        let workspace_id = session.workspace_id.clone();
        tauri::async_runtime::spawn(async move {
            {
                let mut live_map = live_sessions.lock().await;
                let should_remove = live_map
                    .get(&session_id)
                    .is_some_and(|current| Arc::ptr_eq(current, &live));
                if should_remove {
                    live_map.remove(&session_id);
                }
            }
            {
                let mut storage = storage_for_cleanup.lock().await;
                let _ = storage.update_session_status(&session_id, SessionStatus::Exited, None);
            }
            let _ = app_for_cleanup.emit(
                "session/status",
                SessionStatusEvent {
                    session_id: session_id.clone(),
                    workspace_id: workspace_id.clone(),
                    status: SessionStatus::Exited,
                    exit_code: None,
                },
            );
            let _ = app_for_cleanup.emit(
                "session/exit",
                SessionStatusEvent {
                    session_id,
                    workspace_id,
                    status: SessionStatus::Exited,
                    exit_code: None,
                },
            );
        });
    });
}

fn drain_utf8_chunks(pending: &mut Vec<u8>) -> Vec<String> {
    let mut chunks = Vec::new();
    loop {
        match std::str::from_utf8(pending) {
            Ok(decoded) => {
                if !decoded.is_empty() {
                    chunks.push(decoded.to_string());
                }
                pending.clear();
                break;
            }
            Err(error) => {
                let valid_up_to = error.valid_up_to();
                if valid_up_to > 0 {
                    chunks.push(String::from_utf8_lossy(&pending[..valid_up_to]).to_string());
                    pending.drain(..valid_up_to);
                }
                if error.error_len().is_none() {
                    break;
                }
                let invalid_len = error.error_len().unwrap_or(1);
                pending.drain(..invalid_len.min(pending.len()));
            }
        }
    }
    chunks
}

fn build_command(session: &TerminalSession) -> CommandBuilder {
    match session.kind {
        SessionKind::Terminal => {
            let mut command = CommandBuilder::new(default_shell_path());
            for arg in interactive_shell_args(&default_shell_path()) {
                command.arg(arg);
            }
            command
        }
        _ => {
            let line = if session.command.trim().is_empty() {
                default_command_for_kind(&session.kind)
            } else {
                session.command.clone()
            };
            let mut command = CommandBuilder::new(default_shell_path());
            for arg in shell_command_args(&default_shell_path(), &line) {
                command.arg(arg);
            }
            command
        }
    }
}

#[cfg(target_os = "windows")]
fn default_shell_path() -> String {
    std::env::var("TERMINAL_BOARD_SHELL").unwrap_or_else(|_| "powershell.exe".to_string())
}

#[cfg(not(target_os = "windows"))]
fn default_shell_path() -> String {
    std::env::var("TERMINAL_BOARD_SHELL")
        .or_else(|_| std::env::var("SHELL"))
        .unwrap_or_else(|_| "/bin/zsh".to_string())
}

#[cfg(target_os = "windows")]
fn interactive_shell_args(shell: &str) -> Vec<String> {
    let lower = shell.to_ascii_lowercase();
    if lower.contains("powershell") || lower.ends_with("pwsh.exe") || lower.ends_with("\\pwsh") {
        vec!["-NoLogo".to_string(), "-NoExit".to_string()]
    } else if lower.ends_with("cmd.exe") || lower.ends_with("\\cmd") {
        vec!["/K".to_string()]
    } else {
        Vec::new()
    }
}

#[cfg(not(target_os = "windows"))]
fn interactive_shell_args(_shell: &str) -> Vec<String> {
    vec!["-i".to_string()]
}

#[cfg(target_os = "windows")]
fn shell_command_args(shell: &str, line: &str) -> Vec<String> {
    let lower = shell.to_ascii_lowercase();
    if lower.ends_with("cmd.exe") || lower.ends_with("\\cmd") {
        vec!["/K".to_string(), line.to_string()]
    } else {
        vec![
            "-NoLogo".to_string(),
            "-NoExit".to_string(),
            "-Command".to_string(),
            line.to_string(),
        ]
    }
}

#[cfg(not(target_os = "windows"))]
fn shell_command_args(shell: &str, line: &str) -> Vec<String> {
    vec!["-lc".to_string(), format!("{line}; exec {shell} -i")]
}

fn default_command_for_kind(kind: &SessionKind) -> String {
    match kind {
        SessionKind::Codex => "codex".to_string(),
        SessionKind::Claude => "claude".to_string(),
        SessionKind::Hermes => "hermes".to_string(),
        SessionKind::Custom => String::new(),
        SessionKind::Terminal => String::new(),
    }
}

fn resolve_locale() -> String {
    let candidate = std::env::var("LC_ALL")
        .or_else(|_| std::env::var("LANG"))
        .unwrap_or_else(|_| "en_US.UTF-8".to_string());
    let lower = candidate.to_lowercase();
    if lower.contains("utf-8") || lower.contains("utf8") {
        candidate
    } else {
        "en_US.UTF-8".to_string()
    }
}

fn is_closed_error(message: &str) -> bool {
    let lower = message.to_ascii_lowercase();
    lower.contains("broken pipe")
        || lower.contains("input/output error")
        || lower.contains("os error 5")
        || lower.contains("eio")
        || lower.contains("not connected")
        || lower.contains("closed")
}

#[allow(dead_code)]
fn _timestamp_for_future_process_tree_hooks() -> i64 {
    now_ms()
}
