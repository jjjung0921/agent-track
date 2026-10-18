// Install or remove the per-user macOS login and six-hour LaunchAgent.
import { execFileSync } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const label = "io.github.jjjung0921.agent-track.local-routine";
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const home = homedir();
const plist = join(home, "Library/LaunchAgents", `${label}.plist`);
const logDir = join(home, "Library/Logs/agent-track");
const domain = `gui/${process.getuid()}`;
const xml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

if (process.platform !== "darwin") throw new Error("This installer requires macOS");
try { execFileSync("launchctl", ["bootout", domain, plist], { stdio: "ignore" }); } catch { /* Not installed yet. */ }

if (process.argv.includes("--uninstall")) {
  await rm(plist, { force: true });
  console.log(`Removed ${plist}`);
} else {
  const node = execFileSync("which", ["node"], { encoding: "utf8" }).trim();
  await mkdir(dirname(plist), { recursive: true });
  await mkdir(logDir, { recursive: true });
  await writeFile(plist, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${xml(label)}</string>
  <key>ProgramArguments</key><array><string>${xml(node)}</string><string>${xml(join(root, "scripts/local-routine.mjs"))}</string></array>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>21600</integer>
  <key>StandardOutPath</key><string>${xml(join(logDir, "routine.log"))}</string>
  <key>StandardErrorPath</key><string>${xml(join(logDir, "routine-error.log"))}</string>
</dict></plist>
`);
  execFileSync("launchctl", ["bootstrap", domain, plist]);
  console.log(`Installed ${plist}; it runs now and every six hours while logged in.`);
}
