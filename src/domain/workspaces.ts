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

export const WORKSPACE_ACCENTS = [
  { name: "Blue", value: "#60A5FA" },
  { name: "Emerald", value: "#34D399" },
  { name: "Amber", value: "#FBBF24" },
  { name: "Rose", value: "#FB7185" },
  { name: "Violet", value: "#A78BFA" },
  { name: "Cyan", value: "#22D3EE" },
  { name: "Orange", value: "#FB923C" },
  { name: "Fuchsia", value: "#E879F9" },
  { name: "Lime", value: "#A3E635" },
  { name: "Red", value: "#F87171" },
] as const;
