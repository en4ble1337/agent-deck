import { invoke } from "@tauri-apps/api/core";
import type { CommandPreset } from "@/domain/presets";
import type {
  SessionCreateRequest,
  SessionView,
} from "@/domain/sessions";
import type { Workspace, WorkspacePatch } from "@/domain/workspaces";
import { mockBackend } from "@/services/mockBackend";
import { isTauriRuntime } from "@/services/runtime";

export function workspaceList(): Promise<Workspace[]> {
  if (!isTauriRuntime()) {
    return mockBackend.workspaceList();
  }
  return invoke("workspace_list");
}

export function workspaceAdd(path: string): Promise<Workspace> {
  if (!isTauriRuntime()) {
    return mockBackend.workspaceAdd(path);
  }
  return invoke("workspace_add", { path });
}

export function workspaceUpdate(
  id: string,
  patch: WorkspacePatch,
): Promise<Workspace> {
  if (!isTauriRuntime()) {
    return mockBackend.workspaceUpdate(id, patch);
  }
  return invoke("workspace_update", { id, patch });
}

export function workspaceClose(id: string): Promise<Workspace> {
  if (!isTauriRuntime()) {
    return mockBackend.workspaceClose(id);
  }
  return invoke("workspace_close", { id });
}

export function workspaceRemove(
  id: string,
  removeHistory: boolean,
): Promise<void> {
  if (!isTauriRuntime()) {
    return mockBackend.workspaceRemove(id);
  }
  return invoke("workspace_remove", { id, removeHistory });
}

export function presetList(workspaceId?: string): Promise<CommandPreset[]> {
  if (!isTauriRuntime()) {
    return mockBackend.presetList();
  }
  return invoke("preset_list", { workspaceId });
}

export function sessionList(
  workspaceId?: string,
  includeArchived = false,
): Promise<SessionView[]> {
  if (!isTauriRuntime()) {
    return mockBackend.sessionList(workspaceId, includeArchived);
  }
  return invoke("session_list", { workspaceId, includeArchived });
}

export function sessionCreate(
  request: SessionCreateRequest,
): Promise<SessionView> {
  if (!isTauriRuntime()) {
    return mockBackend.sessionCreate(request);
  }
  return invoke("session_create", { request });
}

export function sessionStart(
  sessionId: string,
  cols: number,
  rows: number,
): Promise<SessionView> {
  if (!isTauriRuntime()) {
    return mockBackend.sessionStart(sessionId);
  }
  return invoke("session_start", { sessionId, cols, rows });
}

export function sessionWrite(sessionId: string, data: string): Promise<void> {
  if (!isTauriRuntime()) {
    return mockBackend.sessionWrite(sessionId, data);
  }
  return invoke("session_write", { sessionId, data });
}

export function sessionResize(
  sessionId: string,
  cols: number,
  rows: number,
): Promise<void> {
  if (!isTauriRuntime()) {
    return mockBackend.sessionResize();
  }
  return invoke("session_resize", { sessionId, cols, rows });
}

export function sessionStop(sessionId: string): Promise<SessionView> {
  if (!isTauriRuntime()) {
    return mockBackend.sessionStop(sessionId);
  }
  return invoke("session_stop", { sessionId });
}

export function sessionRestart(
  sessionId: string,
  cols: number,
  rows: number,
): Promise<SessionView> {
  if (!isTauriRuntime()) {
    return mockBackend.sessionRestart(sessionId);
  }
  return invoke("session_restart", { sessionId, cols, rows });
}

export function sessionArchive(sessionId: string): Promise<SessionView> {
  if (!isTauriRuntime()) {
    return mockBackend.sessionArchive(sessionId);
  }
  return invoke("session_archive", { sessionId });
}

export function sessionUnarchive(sessionId: string): Promise<SessionView> {
  if (!isTauriRuntime()) {
    return mockBackend.sessionUnarchive(sessionId);
  }
  return invoke("session_unarchive", { sessionId });
}

export function sessionDelete(
  sessionId: string,
  deleteTranscript: boolean,
): Promise<void> {
  if (!isTauriRuntime()) {
    return mockBackend.sessionDelete(sessionId);
  }
  return invoke("session_delete", { sessionId, deleteTranscript });
}

export function sessionReadTranscript(
  sessionId: string,
  limit?: number,
): Promise<string> {
  if (!isTauriRuntime()) {
    return mockBackend.sessionReadTranscript(sessionId);
  }
  return invoke("session_read_transcript", { sessionId, limit });
}
