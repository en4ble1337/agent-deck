use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub path: String,
    pub accent: String,
    pub is_open: bool,
    pub sort_index: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub last_active_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SessionStatus {
    Created,
    Starting,
    Running,
    Waiting,
    Exited,
    Failed,
    Archived,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SessionKind {
    Terminal,
    Codex,
    Claude,
    Hermes,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandPreset {
    pub id: String,
    pub name: String,
    pub kind: SessionKind,
    pub command: String,
    pub args: Vec<String>,
    pub env: serde_json::Map<String, serde_json::Value>,
    pub icon: String,
    pub workspace_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalSession {
    pub id: String,
    pub workspace_id: String,
    pub preset_id: Option<String>,
    pub kind: SessionKind,
    pub title: String,
    pub command: String,
    pub args: Vec<String>,
    pub cwd: String,
    pub status: SessionStatus,
    pub tile_index: i64,
    pub tile_size: String,
    pub is_archived: bool,
    pub is_pinned: bool,
    pub transcript_path: String,
    pub created_at: i64,
    pub started_at: Option<i64>,
    pub last_active_at: i64,
    pub exited_at: Option<i64>,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionView {
    #[serde(flatten)]
    pub session: TerminalSession,
    pub output_tail: String,
    pub has_process: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspacePatch {
    pub name: Option<String>,
    pub accent: Option<String>,
    pub is_open: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionCreateRequest {
    pub workspace_id: String,
    pub kind: SessionKind,
    pub custom_command: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionAttachmentSaveRequest {
    pub file_name: Option<String>,
    pub mime_type: String,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionAttachment {
    pub path: String,
    pub file_name: String,
    pub mime_type: String,
    pub size: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionOutputEvent {
    pub session_id: String,
    pub workspace_id: String,
    pub data: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionStatusEvent {
    pub session_id: String,
    pub workspace_id: String,
    pub status: SessionStatus,
    pub exit_code: Option<i32>,
}
