import type { SessionKind } from "@/domain/sessions";

export type CommandPreset = {
  id: string;
  name: string;
  kind: SessionKind;
  command: string;
  args: string[];
  env: Record<string, unknown>;
  icon: string;
  workspaceId: string | null;
};
