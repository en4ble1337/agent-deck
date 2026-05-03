use std::collections::HashMap;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use tokio::sync::Mutex;

use crate::backend::app_server::WorkspaceSession;
use crate::types::{WorkspaceEntry, WorkspaceInfo};
use crate::utils::normalize_windows_namespace_path;

pub(crate) const WORKTREE_SETUP_MARKERS_DIR: &str = "worktree-setup";
pub(crate) const WORKTREE_SETUP_MARKER_EXT: &str = "ran";
pub(super) const AGENTS_MD_FILE_NAME: &str = "AGENTS.md";

pub(super) fn copy_agents_md_from_parent_to_worktree(
    parent_repo_root: &PathBuf,
    worktree_root: &PathBuf,
) -> Result<(), String> {
    let source_path = parent_repo_root.join(AGENTS_MD_FILE_NAME);
    if !source_path.is_file() {
        return Ok(());
    }

    let destination_path = worktree_root.join(AGENTS_MD_FILE_NAME);
    if destination_path.is_file() {
        return Ok(());
    }

    let temp_path = worktree_root.join(format!("{AGENTS_MD_FILE_NAME}.tmp"));

    std::fs::copy(&source_path, &temp_path).map_err(|err| {
        format!(
            "Failed to copy {} from {} to {}: {err}",
            AGENTS_MD_FILE_NAME,
            source_path.display(),
            temp_path.display()
        )
    })?;

    std::fs::rename(&temp_path, &destination_path).map_err(|err| {
        let _ = std::fs::remove_file(&temp_path);
        format!(
            "Failed to finalize {} copy to {}: {err}",
            AGENTS_MD_FILE_NAME,
            destination_path.display()
        )
    })?;

    Ok(())
}

pub(crate) fn normalize_setup_script(script: Option<String>) -> Option<String> {
    match script {
        Some(value) if value.trim().is_empty() => None,
        Some(value) => Some(value),
        None => None,
    }
}

pub(crate) fn worktree_setup_marker_path(data_dir: &PathBuf, workspace_id: &str) -> PathBuf {
    data_dir
        .join(WORKTREE_SETUP_MARKERS_DIR)
        .join(format!("{workspace_id}.{WORKTREE_SETUP_MARKER_EXT}"))
}

pub(crate) fn is_workspace_path_dir_core(path: &str) -> bool {
    normalize_workspace_path_input(path).is_dir()
}

pub(crate) fn normalize_workspace_path_input(path: &str) -> PathBuf {
    let trimmed = path.trim();
    if let Some(rest) = trimmed.strip_prefix("~/") {
        if let Some(home) = crate::codex::home::resolve_home_dir() {
            return home.join(rest);
        }
    }
    if trimmed == "~" {
        if let Some(home) = crate::codex::home::resolve_home_dir() {
            return home;
        }
    }
    PathBuf::from(trimmed)
}

pub(crate) fn workspace_path_to_string(path: &PathBuf) -> String {
    normalize_windows_namespace_path(&path.to_string_lossy())
}

pub(crate) fn remove_worktree_dir_all(path: &PathBuf) -> Result<(), String> {
    remove_dir_all_resilient(path)
        .map_err(|err| format!("Failed to remove worktree folder {}: {err}", path.display()))
}

fn remove_dir_all_resilient(path: &Path) -> io::Result<()> {
    match std::fs::remove_dir_all(path) {
        Ok(()) => return Ok(()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(error) => {
            #[cfg(windows)]
            {
                if should_retry_windows_remove(&error) {
                    clear_readonly_recursive(path);
                    if retry_remove_dir_all(path, 4, std::time::Duration::from_millis(75))? {
                        return Ok(());
                    }

                    terminate_processes_referencing_path(path);
                    if retry_remove_dir_all(path, 8, std::time::Duration::from_millis(150))? {
                        return Ok(());
                    }

                    schedule_delete_tree_on_reboot(path)?;
                    return Ok(());
                }
            }
            Err(error)
        }
    }
}

#[cfg(windows)]
fn should_retry_windows_remove(error: &io::Error) -> bool {
    error.kind() == io::ErrorKind::PermissionDenied || error.raw_os_error() == Some(32)
}

#[cfg(windows)]
fn retry_remove_dir_all(
    path: &Path,
    attempts: usize,
    delay: std::time::Duration,
) -> io::Result<bool> {
    for _ in 0..attempts {
        std::thread::sleep(delay);
        match std::fs::remove_dir_all(path) {
            Ok(()) => return Ok(true),
            Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(true),
            Err(error) if should_retry_windows_remove(&error) => {}
            Err(error) => return Err(error),
        }
    }
    Ok(false)
}

#[cfg(windows)]
fn clear_readonly_recursive(path: &Path) {
    let Ok(metadata) = std::fs::symlink_metadata(path) else {
        return;
    };

    if metadata.is_dir() {
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                clear_readonly_recursive(&entry.path());
            }
        }
    }

    let mut permissions = metadata.permissions();
    if permissions.readonly() {
        permissions.set_readonly(false);
        let _ = std::fs::set_permissions(path, permissions);
    }
}

#[cfg(windows)]
fn terminate_processes_referencing_path(path: &Path) {
    let target = path.to_string_lossy().to_string();
    let slash_target = target.replace('\\', "/");
    let script = format!(
        r#"
$targets = @({target}, {slash_target})
$matches = Get-CimInstance Win32_Process | Where-Object {{
  $commandLine = $_.CommandLine
  if (-not $commandLine -or $_.ProcessId -eq $PID) {{ return $false }}
  foreach ($target in $targets) {{
    if ($commandLine.IndexOf($target, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {{
      return $true
    }}
  }}
  return $false
}} | Select-Object -ExpandProperty ProcessId
$matches
"#,
        target = powershell_single_quoted(&target),
        slash_target = powershell_single_quoted(&slash_target),
    );

    let Ok(output) = crate::shared::process_core::std_command("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &script,
        ])
        .output()
    else {
        return;
    };

    let pids = String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| line.trim().parse::<u32>().ok())
        .filter(|pid| *pid != std::process::id())
        .collect::<Vec<_>>();

    for pid in pids {
        let _ = crate::shared::process_core::std_command("taskkill.exe")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
    }
}

#[cfg(windows)]
fn powershell_single_quoted(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

#[cfg(windows)]
fn schedule_delete_tree_on_reboot(path: &Path) -> io::Result<()> {
    schedule_delete_tree_on_reboot_inner(path)?;
    Ok(())
}

#[cfg(windows)]
fn schedule_delete_tree_on_reboot_inner(path: &Path) -> io::Result<()> {
    let metadata = match std::fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error),
    };

    if metadata.is_dir() {
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                let _ = schedule_delete_tree_on_reboot_inner(&entry.path());
            }
        }
    }

    schedule_path_delete_on_reboot(path)
}

#[cfg(windows)]
fn schedule_path_delete_on_reboot(path: &Path) -> io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{MoveFileExW, MOVEFILE_DELAY_UNTIL_REBOOT};

    let mut wide_path = path.as_os_str().encode_wide().collect::<Vec<_>>();
    wide_path.push(0);

    let success = unsafe {
        MoveFileExW(
            wide_path.as_ptr(),
            std::ptr::null(),
            MOVEFILE_DELAY_UNTIL_REBOOT,
        )
    };

    if success == 0 {
        return Err(io::Error::last_os_error());
    }
    Ok(())
}

pub(crate) async fn list_workspaces_core(
    workspaces: &Mutex<HashMap<String, WorkspaceEntry>>,
    sessions: &Mutex<HashMap<String, Arc<WorkspaceSession>>>,
) -> Vec<WorkspaceInfo> {
    let workspaces = workspaces.lock().await;
    let sessions = sessions.lock().await;
    let mut result = Vec::new();
    for entry in workspaces.values() {
        result.push(WorkspaceInfo {
            id: entry.id.clone(),
            name: entry.name.clone(),
            path: entry.path.clone(),
            connected: sessions.contains_key(&entry.id),
            kind: entry.kind.clone(),
            parent_id: entry.parent_id.clone(),
            worktree: entry.worktree.clone(),
            settings: entry.settings.clone(),
        });
    }
    sort_workspaces(&mut result);
    result
}

pub(super) async fn resolve_entry_and_parent(
    workspaces: &Mutex<HashMap<String, WorkspaceEntry>>,
    workspace_id: &str,
) -> Result<(WorkspaceEntry, Option<WorkspaceEntry>), String> {
    let workspaces = workspaces.lock().await;
    let entry = workspaces
        .get(workspace_id)
        .cloned()
        .ok_or_else(|| "workspace not found".to_string())?;
    let parent_entry = entry
        .parent_id
        .as_ref()
        .and_then(|parent_id| workspaces.get(parent_id))
        .cloned();
    Ok((entry, parent_entry))
}

pub(super) async fn resolve_workspace_root(
    workspaces: &Mutex<HashMap<String, WorkspaceEntry>>,
    workspace_id: &str,
) -> Result<PathBuf, String> {
    let workspaces = workspaces.lock().await;
    let entry = workspaces
        .get(workspace_id)
        .cloned()
        .ok_or_else(|| "workspace not found".to_string())?;
    Ok(PathBuf::from(entry.path))
}

pub(super) fn sort_workspaces(workspaces: &mut [WorkspaceInfo]) {
    workspaces.sort_by(|a, b| {
        let a_order = a.settings.sort_order.unwrap_or(u32::MAX);
        let b_order = b.settings.sort_order.unwrap_or(u32::MAX);
        if a_order != b_order {
            return a_order.cmp(&b_order);
        }
        a.name.cmp(&b.name).then_with(|| a.id.cmp(&b.id))
    });
}

#[cfg(test)]
mod tests {
    use super::{
        copy_agents_md_from_parent_to_worktree, normalize_workspace_path_input,
        remove_worktree_dir_all, workspace_path_to_string, AGENTS_MD_FILE_NAME,
    };
    use std::path::PathBuf;
    use std::sync::Mutex;
    use uuid::Uuid;

    static ENV_LOCK: Mutex<()> = Mutex::new(());

    fn make_temp_dir() -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("agent-deck-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).expect("failed to create temp dir");
        dir
    }

    #[test]
    fn copies_agents_md_when_missing_in_worktree() {
        let parent = make_temp_dir();
        let worktree = make_temp_dir();
        let parent_agents = parent.join(AGENTS_MD_FILE_NAME);
        let worktree_agents = worktree.join(AGENTS_MD_FILE_NAME);

        std::fs::write(&parent_agents, "parent").expect("failed to write parent AGENTS.md");

        copy_agents_md_from_parent_to_worktree(&parent, &worktree).expect("copy should succeed");

        let copied = std::fs::read_to_string(&worktree_agents)
            .expect("worktree AGENTS.md should exist after copy");
        assert_eq!(copied, "parent");

        let _ = std::fs::remove_dir_all(parent);
        let _ = std::fs::remove_dir_all(worktree);
    }

    #[test]
    fn does_not_overwrite_existing_worktree_agents_md() {
        let parent = make_temp_dir();
        let worktree = make_temp_dir();
        let parent_agents = parent.join(AGENTS_MD_FILE_NAME);
        let worktree_agents = worktree.join(AGENTS_MD_FILE_NAME);

        std::fs::write(&parent_agents, "parent").expect("failed to write parent AGENTS.md");
        std::fs::write(&worktree_agents, "branch-specific")
            .expect("failed to write worktree AGENTS.md");

        copy_agents_md_from_parent_to_worktree(&parent, &worktree).expect("copy should succeed");

        let retained = std::fs::read_to_string(&worktree_agents)
            .expect("worktree AGENTS.md should still exist");
        assert_eq!(retained, "branch-specific");

        let _ = std::fs::remove_dir_all(parent);
        let _ = std::fs::remove_dir_all(worktree);
    }

    #[test]
    fn normalize_workspace_path_input_expands_home_prefix() {
        let _guard = ENV_LOCK.lock().expect("lock env");
        let previous_home = std::env::var("HOME").ok();
        std::env::set_var("HOME", "/tmp/cm-home");

        assert_eq!(
            normalize_workspace_path_input("~/dev/repo"),
            PathBuf::from("/tmp/cm-home/dev/repo")
        );

        match previous_home {
            Some(value) => std::env::set_var("HOME", value),
            None => std::env::remove_var("HOME"),
        }
    }

    #[test]
    fn workspace_path_to_string_strips_windows_namespace_prefixes() {
        assert_eq!(
            workspace_path_to_string(&PathBuf::from(r"\\?\I:\gpt-projects\AgentDeck")),
            r"I:\gpt-projects\AgentDeck"
        );
    }

    #[test]
    fn remove_worktree_dir_all_succeeds_when_path_is_missing() {
        let missing = std::env::temp_dir().join(format!("agent-deck-missing-{}", Uuid::new_v4()));

        remove_worktree_dir_all(&missing).expect("missing folder should be treated as removed");
    }
}
