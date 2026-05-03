import { Cloud, Download, Plus } from "lucide-react";

type HomeActionsProps = {
  onAddWorkspace: () => void;
  onAddWorkspaceFromUrl: () => void;
  onConnectRemoteWorkspace: () => void;
};

export function HomeActions({
  onAddWorkspace,
  onAddWorkspaceFromUrl,
  onConnectRemoteWorkspace,
}: HomeActionsProps) {
  return (
    <div className="home-actions">
      <button
        className="home-button primary home-add-workspaces-button"
        onClick={onAddWorkspace}
        data-tauri-drag-region="false"
      >
        <span className="home-icon" aria-hidden>
          <Plus size={18} strokeWidth={2.5} />
        </span>
        Add Workspaces
      </button>
      <button
        className="home-button secondary home-add-workspace-from-url-button"
        onClick={onAddWorkspaceFromUrl}
        data-tauri-drag-region="false"
      >
        <span className="home-icon" aria-hidden>
          <Download size={18} strokeWidth={2.5} />
        </span>
        Add Workspace from URL
      </button>
      <button
        className="home-button secondary home-connect-remote-workspace-button"
        onClick={onConnectRemoteWorkspace}
        data-tauri-drag-region="false"
      >
        <span className="home-icon" aria-hidden>
          <Cloud size={18} strokeWidth={2.5} />
        </span>
        Connect to Remote
      </button>
    </div>
  );
}
