export type Workspace = {
  id: string;
  name: string;
  path: string;
  accent: string;
  isOpen: boolean;
  sortIndex: number;
  createdAt: number;
  updatedAt: number;
  lastActiveAt: number;
};

export type WorkspacePatch = {
  name?: string;
  accent?: string;
  isOpen?: boolean;
};
