import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const mode = process.argv[2] ?? "dev";
const root = process.cwd();
const pathKey =
  Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";

function existingToolDirs() {
  return [
    path.join(process.env.ProgramFiles ?? "C:\\Program Files", "CMake", "bin"),
    path.join(os.homedir(), ".cargo", "bin"),
  ].filter((dir) => fs.existsSync(dir));
}

function withToolPath() {
  const env = { ...process.env };
  const currentPath = env[pathKey] ?? "";
  env[pathKey] = [...existingToolDirs(), currentPath]
    .filter(Boolean)
    .join(path.delimiter);
  return env;
}

function quoteCmdArg(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function run(command, args, env) {
  return new Promise((resolve) => {
    const isCmdShim =
      process.platform === "win32" && command.toLowerCase().endsWith(".cmd");
    const child = isCmdShim
      ? spawn([quoteCmdArg(command), ...args.map(quoteCmdArg)].join(" "), {
          cwd: root,
          env,
          shell: true,
          stdio: "inherit",
        })
      : spawn(command, args, {
      cwd: root,
      env,
      shell: false,
      stdio: "inherit",
    });
    child.on("close", resolve);
  });
}

const env = withToolPath();
const doctorCode = await run(process.execPath, ["scripts/doctor.mjs", "--strict"], env);
if (doctorCode !== 0) {
  process.exit(doctorCode);
}
if (mode === "doctor") {
  process.exit(0);
}

const tauriBin = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tauri.cmd" : "tauri",
);
const tauriArgs =
  process.platform === "win32"
    ? mode === "build"
      ? ["build", "--config", "src-tauri/tauri.windows.conf.json"]
      : ["dev", "--config", "src-tauri/tauri.windows.conf.json"]
    : [mode === "build" ? "build" : "dev"];

process.exit(await run(tauriBin, tauriArgs, env));
