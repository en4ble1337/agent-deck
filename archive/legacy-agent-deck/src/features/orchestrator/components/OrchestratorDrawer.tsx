import { useEffect } from "react";
import type { OrchestratorConfig, WorkspaceInfo } from "@/types";
import { OrchestratorPanel } from "./OrchestratorPanel";

type OrchestratorDrawerProps = {
  workspaces: WorkspaceInfo[];
  activeWorkspace: WorkspaceInfo | null | undefined;
  orchestratorConfig: OrchestratorConfig | null;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSpawnThread?: (workspaceId: string, threadId: string) => void;
  onOpenSettings?: () => void;
};

export function OrchestratorDrawer({
  workspaces,
  activeWorkspace,
  orchestratorConfig,
  isOpen,
  onToggle,
  onClose,
  onSpawnThread,
  onOpenSettings,
}: OrchestratorDrawerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToggle]);

  return (
    <div className={`orchestrator-drawer${isOpen ? " is-open" : ""}`}>
      <OrchestratorPanel
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        orchestratorConfig={orchestratorConfig}
        onSpawnThread={onSpawnThread}
        onOpenSettings={onOpenSettings}
        onClose={onClose}
      />
    </div>
  );
}
