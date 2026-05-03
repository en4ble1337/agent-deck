import {
  listen,
  type EventCallback,
  type UnlistenFn,
} from "@tauri-apps/api/event";
import type {
  SessionOutputEvent,
  SessionStatusEvent,
} from "@/domain/sessions";

export function onSessionOutput(
  callback: EventCallback<SessionOutputEvent>,
): Promise<UnlistenFn> {
  return listen("session/output", callback);
}

export function onSessionStatus(
  callback: EventCallback<SessionStatusEvent>,
): Promise<UnlistenFn> {
  return listen("session/status", callback);
}

export function onSessionExit(
  callback: EventCallback<SessionStatusEvent>,
): Promise<UnlistenFn> {
  return listen("session/exit", callback);
}
