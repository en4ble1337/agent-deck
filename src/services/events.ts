import {
  listen,
  type EventCallback,
  type UnlistenFn,
} from "@tauri-apps/api/event";
import type {
  SessionOutputEvent,
  SessionStatusEvent,
} from "@/domain/sessions";
import { mockBackend } from "@/services/mockBackend";
import { isTauriRuntime } from "@/services/runtime";

export function onSessionOutput(
  callback: EventCallback<SessionOutputEvent>,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return Promise.resolve(mockBackend.onSessionOutput(callback));
  }
  return listen("session/output", callback);
}

export function onSessionStatus(
  callback: EventCallback<SessionStatusEvent>,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return Promise.resolve(mockBackend.onSessionStatus(callback));
  }
  return listen("session/status", callback);
}

export function onSessionExit(
  callback: EventCallback<SessionStatusEvent>,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return Promise.resolve(mockBackend.onSessionStatus(callback));
  }
  return listen("session/exit", callback);
}
