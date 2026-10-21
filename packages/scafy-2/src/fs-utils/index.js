import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import inquirer from "inquirer";
import pc from "picocolors";

export const DEFAULT_IGNORE_PATTERNS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".DS_Store",
  "coverage",
  ".next",
  ".turbo",
];

export function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent || "";
  if (userAgent.startsWith("pnpm")) return "pnpm";
  if (userAgent.startsWith("yarn")) return "yarn";
  if (userAgent.startsWith("bun")) return "bun";
  return "npm";
}

export function installDependencies(targetDir, pkgManager = detectPackageManager()) {
  console.log(`\n${pc.dim(`Installing dependencies with ${pkgManager}...`)}\n`);
  const installCmd = pkgManager === "yarn" ? "yarn" : `${pkgManager} install`;
  execSync(installCmd, {
    cwd: targetDir,
    stdio: "inherit",
  });
}

export function initGitRepository(targetDir) {
  console.log(`\n${pc.dim("Initializing Git repository...")}`);
  try {
    execSync("git init", { cwd: targetDir, stdio: "ignore" });
    console.log(`${pc.green("✓")} Git repository initialized!`);
  } catch (error) {
    console.log(`${pc.yellow("!")} Could not initialize Git repository.`);
  }
}

export function isDirectoryEmpty(directory, ignorePatterns = DEFAULT_IGNORE_PATTERNS) {
  if (!fs.existsSync(directory)) return true;

  const files = fs.readdirSync(directory);
  const filteredFiles = files.filter((file) => !ignorePatterns.includes(file));

  return filteredFiles.length === 0;
}

export function copyDirectory(source, target, options = {}) {
  const { ignore = DEFAULT_IGNORE_PATTERNS } = options;

  if (!fs.existsSync(source)) {
    throw new Error(`Template directory does not exist: ${source}`);
  }

  // Uses Node's fs.cpSync with a filter predicate
  fs.cpSync(source, target, {
    recursive: true,
    force: true,
    filter: (src) => {
      const basename = path.basename(src);

      // Skip items matching any ignored pattern
      if (ignore.includes(basename)) {
        return false;
      }

      return true;
    },
  });
}

export function updatePackageJsonName(targetDir, newName) {
  const pkgPath = path.join(targetDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      pkg.name = newName;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    } catch {
      // Ignore if package.json is missing or malformed
    }
  }
}

export async function handleExistingDirectory(targetDir, options = {}) {
  const { ignore = DEFAULT_IGNORE_PATTERNS } = options;

  if (isDirectoryEmpty(targetDir, ignore)) return "create";

  const { action } = await inquirer.prompt([
    {
      type: "select",
      name: "action",
      message: "Target directory is not empty. Choose how to proceed:",
      choices: [
        { name: "Remove existing files and continue", value: "remove" },
        { name: "Ignore files and continue", value: "ignore" },
        { name: "Cancel operation", value: "cancel" },
      ],
    },
  ]);

  if (action === "cancel") throw new Error("Operation cancelled.");

  if (action === "remove") {
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.mkdirSync(targetDir, { recursive: true });
    return "create";
  }

  return "ignore";
}