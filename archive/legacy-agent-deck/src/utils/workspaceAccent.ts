export function getWorkspaceAccent(workspaceId: string, workspaceName: string) {
  const palette = [
    "#46d9c8",
    "#8fb3ff",
    "#f2c66d",
    "#f58fb6",
    "#9ed66f",
    "#c49cff",
    "#ff9f6e",
    "#6ad6ff",
  ];
  const input = `${workspaceId}:${workspaceName}`;
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return palette[hash % palette.length];
}
