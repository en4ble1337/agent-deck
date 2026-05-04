use std::{
    fs,
    io::{Read, Seek, SeekFrom},
    path::{Path, PathBuf},
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::models::{
    CommandPreset, SessionAttachment, SessionAttachmentSaveRequest, SessionCreateRequest,
    SessionKind, SessionStatus, SessionView, TerminalSession, Workspace, WorkspacePatch,
};

pub type SharedStorage = Arc<Mutex<Storage>>;

const TRANSCRIPT_TAIL_BYTES: usize = 24 * 1024;
const MAX_ATTACHMENT_BYTES: usize = 20 * 1024 * 1024;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistedData {
    version: u32,
    workspaces: Vec<Workspace>,
    sessions: Vec<TerminalSession>,
    presets: Vec<CommandPreset>,
}

impl Default for PersistedData {
    fn default() -> Self {
        Self {
            version: 1,
            workspaces: Vec::new(),
            sessions: Vec::new(),
            presets: default_presets(),
        }
    }
}

pub struct Storage {
    data_dir: PathBuf,
    data_path: PathBuf,
    data: PersistedData,
}

impl Storage {
    pub fn load(data_dir: PathBuf) -> Result<Self, String> {
        fs::create_dir_all(&data_dir).map_err(|error| {
            format!(
                "Failed to create app data directory {}: {error}",
                data_dir.display()
            )
        })?;
        fs::create_dir_all(data_dir.join("transcripts"))
            .map_err(|error| format!("Failed to create transcript directory: {error}"))?;

        let data_path = data_dir.join("terminal-board.json");
        let data = if data_path.exists() {
            let raw = fs::read_to_string(&data_path)
                .map_err(|error| format!("Failed to read app storage: {error}"))?;
            let mut parsed: PersistedData = serde_json::from_str(&raw)
                .map_err(|error| format!("Failed to parse app storage: {error}"))?;
            if parsed.presets.is_empty() {
                parsed.presets = default_presets();
            }
            parsed
        } else {
            PersistedData::default()
        };

        Ok(Self {
            data_dir,
            data_path,
            data,
        })
    }

    pub fn save(&self) -> Result<(), String> {
        let raw = serde_json::to_string_pretty(&self.data)
            .map_err(|error| format!("Failed to serialize app storage: {error}"))?;
        fs::write(&self.data_path, raw)
            .map_err(|error| format!("Failed to write app storage: {error}"))
    }

    pub fn list_workspaces(&self) -> Vec<Workspace> {
        let mut workspaces = self.data.workspaces.clone();
        workspaces.sort_by_key(|workspace| workspace.sort_index);
        workspaces
    }

    pub fn add_workspace(&mut self, path: String) -> Result<Workspace, String> {
        let normalized = normalize_path(&path)?;
        if let Some(existing) = self
            .data
            .workspaces
            .iter_mut()
            .find(|workspace| paths_equal(&workspace.path, &normalized))
        {
            existing.is_open = true;
            existing.updated_at = now_ms();
            existing.last_active_at = existing.updated_at;
            let workspace = existing.clone();
            self.save()?;
            return Ok(workspace);
        }

        let timestamp = now_ms();
        let workspace = Workspace {
            id: Uuid::new_v4().to_string(),
            name: workspace_name(&normalized),
            path: normalized.clone(),
            accent: accent_for_index(self.data.workspaces.len()),
            is_open: true,
            sort_index: self.data.workspaces.len() as i64,
            created_at: timestamp,
            updated_at: timestamp,
            last_active_at: timestamp,
        };
        self.data.workspaces.push(workspace.clone());
        self.save()?;
        Ok(workspace)
    }

    pub fn update_workspace(
        &mut self,
        workspace_id: &str,
        patch: WorkspacePatch,
    ) -> Result<Workspace, String> {
        let timestamp = now_ms();
        let workspace = self
            .data
            .workspaces
            .iter_mut()
            .find(|workspace| workspace.id == workspace_id)
            .ok_or_else(|| "Workspace not found".to_string())?;

        if let Some(name) = patch.name {
            let trimmed = name.trim();
            if !trimmed.is_empty() {
                workspace.name = trimmed.to_string();
            }
        }
        if let Some(accent) = patch.accent {
            workspace.accent = accent;
        }
        if let Some(is_open) = patch.is_open {
            workspace.is_open = is_open;
        }
        workspace.updated_at = timestamp;
        let updated = workspace.clone();
        self.save()?;
        Ok(updated)
    }

    pub fn close_workspace(&mut self, workspace_id: &str) -> Result<Workspace, String> {
        self.update_workspace(
            workspace_id,
            WorkspacePatch {
                name: None,
                accent: None,
                is_open: Some(false),
            },
        )
    }

    pub fn remove_workspace(
        &mut self,
        workspace_id: &str,
        remove_history: bool,
    ) -> Result<(), String> {
        if remove_history {
            let session_ids: Vec<String> = self
                .data
                .sessions
                .iter()
                .filter(|session| session.workspace_id == workspace_id)
                .map(|session| session.id.clone())
                .collect();
            for session_id in session_ids {
                self.delete_session(&session_id, true)?;
            }
            self.data
                .workspaces
                .retain(|workspace| workspace.id != workspace_id);
        } else {
            self.close_workspace(workspace_id)?;
            return Ok(());
        }
        self.save()
    }

    pub fn list_presets(&self, workspace_id: Option<&str>) -> Vec<CommandPreset> {
        self.data
            .presets
            .iter()
            .filter(|preset| {
                preset.workspace_id.is_none()
                    || workspace_id.is_some_and(|id| preset.workspace_id.as_deref() == Some(id))
            })
            .cloned()
            .collect()
    }

    pub fn list_sessions(
        &self,
        workspace_id: Option<&str>,
        include_archived: bool,
        live_session_ids: &[String],
    ) -> Vec<SessionView> {
        let mut sessions: Vec<SessionView> = self
            .data
            .sessions
            .iter()
            .filter(|session| {
                workspace_id.is_none_or(|id| session.workspace_id == id)
                    && (include_archived || !session.is_archived)
            })
            .map(|session| SessionView {
                session: session.clone(),
                output_tail: self
                    .read_transcript_tail(&session.transcript_path, TRANSCRIPT_TAIL_BYTES),
                has_process: live_session_ids.iter().any(|id| id == &session.id),
            })
            .collect();
        sessions.sort_by(|a, b| b.session.last_active_at.cmp(&a.session.last_active_at));
        sessions
    }

    pub fn create_session(
        &mut self,
        request: SessionCreateRequest,
    ) -> Result<TerminalSession, String> {
        let workspace = self
            .data
            .workspaces
            .iter()
            .find(|workspace| workspace.id == request.workspace_id)
            .ok_or_else(|| "Workspace not found".to_string())?;
        if !Path::new(&workspace.path).is_dir() {
            return Err("Workspace folder no longer exists".to_string());
        }

        let timestamp = now_ms();
        let id = Uuid::new_v4().to_string();
        let command = command_for_kind(&request.kind, request.custom_command.as_deref());
        let title = title_for_kind(&request.kind, request.custom_command.as_deref());
        let transcript_path = self
            .data_dir
            .join("transcripts")
            .join(&workspace.id)
            .join(format!("{id}.log"));
        if let Some(parent) = transcript_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("Failed to create transcript folder: {error}"))?;
        }

        let session = TerminalSession {
            id,
            workspace_id: workspace.id.clone(),
            preset_id: None,
            kind: request.kind,
            title,
            command,
            args: Vec::new(),
            cwd: workspace.path.clone(),
            status: SessionStatus::Created,
            tile_index: self.data.sessions.len() as i64,
            tile_size: "medium".to_string(),
            is_archived: false,
            is_pinned: false,
            transcript_path: transcript_path.to_string_lossy().to_string(),
            created_at: timestamp,
            started_at: None,
            last_active_at: timestamp,
            exited_at: None,
            exit_code: None,
        };
        self.data.sessions.push(session.clone());
        self.save()?;
        Ok(session)
    }

    pub fn get_session(&self, session_id: &str) -> Result<TerminalSession, String> {
        self.data
            .sessions
            .iter()
            .find(|session| session.id == session_id)
            .cloned()
            .ok_or_else(|| "Session not found".to_string())
    }

    pub fn session_view(&self, session_id: &str, has_process: bool) -> Result<SessionView, String> {
        let session = self.get_session(session_id)?;
        Ok(SessionView {
            output_tail: self.read_transcript_tail(&session.transcript_path, TRANSCRIPT_TAIL_BYTES),
            session,
            has_process,
        })
    }

    pub fn save_session_attachment(
        &self,
        session_id: &str,
        request: SessionAttachmentSaveRequest,
    ) -> Result<SessionAttachment, String> {
        let session = self.get_session(session_id)?;
        if !request.mime_type.starts_with("image/") {
            return Err("Only image attachments can be pasted here".to_string());
        }
        if request.bytes.is_empty() {
            return Err("Pasted image was empty".to_string());
        }
        if request.bytes.len() > MAX_ATTACHMENT_BYTES {
            return Err("Pasted image is too large".to_string());
        }

        let workspace_path = Path::new(&session.cwd);
        if !workspace_path.is_dir() {
            return Err("Workspace folder no longer exists".to_string());
        }
        let file_name = attachment_file_name(
            request.file_name.as_deref(),
            &request.mime_type,
            request.bytes.as_slice(),
        );
        let unique_name = format!("{}-{}-{file_name}", now_ms(), short_uuid());
        let attachment_dir = workspace_path
            .join(".workspace-deck")
            .join("attachments")
            .join(&session.id);
        fs::create_dir_all(&attachment_dir)
            .map_err(|error| format!("Failed to create attachment folder: {error}"))?;
        let path = attachment_dir.join(unique_name);
        fs::write(&path, &request.bytes)
            .map_err(|error| format!("Failed to save pasted image: {error}"))?;

        Ok(SessionAttachment {
            path: path.to_string_lossy().to_string(),
            file_name: path
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("pasted-image.png")
                .to_string(),
            mime_type: request.mime_type,
            size: request.bytes.len(),
        })
    }

    pub fn update_session_status(
        &mut self,
        session_id: &str,
        status: SessionStatus,
        exit_code: Option<i32>,
    ) -> Result<TerminalSession, String> {
        let timestamp = now_ms();
        let session = self
            .data
            .sessions
            .iter_mut()
            .find(|session| session.id == session_id)
            .ok_or_else(|| "Session not found".to_string())?;
        match status {
            SessionStatus::Created => {
                session.started_at = None;
                session.exited_at = None;
                session.exit_code = None;
            }
            SessionStatus::Running => {
                session.started_at = Some(timestamp);
                session.exited_at = None;
                session.exit_code = None;
            }
            SessionStatus::Exited | SessionStatus::Failed => {
                session.exited_at = Some(timestamp);
                session.exit_code = exit_code;
            }
            SessionStatus::Starting | SessionStatus::Waiting | SessionStatus::Archived => {}
        }
        session.status = status;
        session.last_active_at = timestamp;
        let updated = session.clone();
        self.save()?;
        Ok(updated)
    }

    pub fn touch_session(&mut self, session_id: &str) -> Result<(), String> {
        let timestamp = now_ms();
        if let Some(session) = self
            .data
            .sessions
            .iter_mut()
            .find(|session| session.id == session_id)
        {
            session.last_active_at = timestamp;
        }
        Ok(())
    }

    pub fn archive_session(
        &mut self,
        session_id: &str,
        archived: bool,
    ) -> Result<SessionView, String> {
        let session = self
            .data
            .sessions
            .iter_mut()
            .find(|session| session.id == session_id)
            .ok_or_else(|| "Session not found".to_string())?;
        session.is_archived = archived;
        session.status = if archived {
            SessionStatus::Archived
        } else if session.exited_at.is_some() {
            SessionStatus::Exited
        } else {
            SessionStatus::Created
        };
        session.last_active_at = now_ms();
        let has_process = false;
        let session = session.clone();
        self.save()?;
        Ok(SessionView {
            output_tail: self.read_transcript_tail(&session.transcript_path, TRANSCRIPT_TAIL_BYTES),
            session,
            has_process,
        })
    }

    pub fn delete_session(
        &mut self,
        session_id: &str,
        delete_transcript: bool,
    ) -> Result<(), String> {
        let transcript_path = self
            .data
            .sessions
            .iter()
            .find(|session| session.id == session_id)
            .map(|session| session.transcript_path.clone());
        self.data
            .sessions
            .retain(|session| session.id != session_id);
        if delete_transcript {
            if let Some(path) = transcript_path {
                if Path::new(&path).exists() {
                    fs::remove_file(&path)
                        .map_err(|error| format!("Failed to remove transcript: {error}"))?;
                }
            }
        }
        self.save()
    }

    pub fn read_transcript_tail(&self, path: &str, limit: usize) -> String {
        read_file_tail(Path::new(path), limit).unwrap_or_default()
    }
}

pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}

fn normalize_path(path: &str) -> Result<String, String> {
    let path = PathBuf::from(path);
    let canonical = path
        .canonicalize()
        .map_err(|error| format!("Workspace folder is not available: {error}"))?;
    if !canonical.is_dir() {
        return Err("Workspace path must be a folder".to_string());
    }
    Ok(canonical.to_string_lossy().to_string())
}

fn paths_equal(left: &str, right: &str) -> bool {
    if cfg!(target_os = "windows") {
        left.eq_ignore_ascii_case(right)
    } else {
        left == right
    }
}

fn workspace_name(path: &str) -> String {
    Path::new(path)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .unwrap_or(path)
        .to_string()
}

fn accent_for_index(index: usize) -> String {
    const PALETTE: [&str; 10] = [
        "#60A5FA", "#34D399", "#FBBF24", "#FB7185", "#A78BFA", "#22D3EE", "#FB923C", "#E879F9",
        "#A3E635", "#F87171",
    ];
    PALETTE[index % PALETTE.len()].to_string()
}

fn default_presets() -> Vec<CommandPreset> {
    vec![
        preset("terminal", "Terminal", SessionKind::Terminal, ""),
        preset("codex", "Codex", SessionKind::Codex, "codex"),
        preset("claude", "Claude", SessionKind::Claude, "claude"),
        preset("custom", "Custom", SessionKind::Custom, ""),
    ]
}

fn preset(id: &str, name: &str, kind: SessionKind, command: &str) -> CommandPreset {
    CommandPreset {
        id: id.to_string(),
        name: name.to_string(),
        kind,
        command: command.to_string(),
        args: Vec::new(),
        env: serde_json::Map::new(),
        icon: id.to_string(),
        workspace_id: None,
    }
}

fn command_for_kind(kind: &SessionKind, custom_command: Option<&str>) -> String {
    match kind {
        SessionKind::Terminal => String::new(),
        SessionKind::Codex => "codex".to_string(),
        SessionKind::Claude => "claude".to_string(),
        SessionKind::Hermes => "hermes".to_string(),
        SessionKind::Custom => custom_command.unwrap_or("").trim().to_string(),
    }
}

fn title_for_kind(kind: &SessionKind, custom_command: Option<&str>) -> String {
    match kind {
        SessionKind::Terminal => "Terminal".to_string(),
        SessionKind::Codex => "Codex".to_string(),
        SessionKind::Claude => "Claude".to_string(),
        SessionKind::Hermes => "Hermes".to_string(),
        SessionKind::Custom => custom_command
            .map(str::trim)
            .filter(|command| !command.is_empty())
            .unwrap_or("Custom")
            .to_string(),
    }
}

fn read_file_tail(path: &Path, limit: usize) -> Result<String, String> {
    if !path.exists() {
        return Ok(String::new());
    }
    let mut file =
        fs::File::open(path).map_err(|error| format!("Failed to open transcript: {error}"))?;
    let length = file
        .metadata()
        .map_err(|error| format!("Failed to read transcript metadata: {error}"))?
        .len();
    let start = length.saturating_sub(limit as u64);
    file.seek(SeekFrom::Start(start))
        .map_err(|error| format!("Failed to seek transcript: {error}"))?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|error| format!("Failed to read transcript: {error}"))?;
    Ok(String::from_utf8_lossy(&buffer).to_string())
}

fn attachment_file_name(file_name: Option<&str>, mime_type: &str, bytes: &[u8]) -> String {
    let candidate = file_name
        .map(sanitize_file_name)
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "pasted-image".to_string());
    let path = Path::new(&candidate);
    if path.extension().and_then(|ext| ext.to_str()).is_some() {
        candidate
    } else {
        format!("{candidate}.{}", image_extension(mime_type, bytes))
    }
}

fn sanitize_file_name(file_name: &str) -> String {
    file_name
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '.' | '-' | '_') {
                ch
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches(|ch| matches!(ch, '.' | '-' | '_'))
        .to_string()
}

fn image_extension(mime_type: &str, bytes: &[u8]) -> &'static str {
    match mime_type {
        "image/jpeg" => "jpg",
        "image/gif" => "gif",
        "image/webp" => "webp",
        "image/bmp" => "bmp",
        "image/svg+xml" => "svg",
        "image/png" => "png",
        _ if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) => "jpg",
        _ if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") => "gif",
        _ if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(&b"WEBP"[..]) => "webp",
        _ => "png",
    }
}

fn short_uuid() -> String {
    Uuid::new_v4().to_string()[..8].to_string()
}
