#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createTemplateSync } from "@zikojs/workflow";
import path from "node:path";

const SCAFFOLDERS = [
  "scafy/templates/*",
];

export async function release({
  name,
  remote = "origin",
  prefix = `${name}-v`,
  commitMessage = (version) => `chore: release ${version}`,
} = {}) {
  if (!name) {
    throw new Error("Release name is required.");
  }

  const sync = createTemplateSync(SCAFFOLDERS);
  const rl = createInterface({ input: stdin, output: stdout });

  function git(...args) {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["inherit", "pipe", "inherit"],
    }).trim();
  }

  let prepared = false;

  try {
    const version = (
      await rl.question("Enter release version (e.g. 1.0.0): ")
    ).trim();

    if (!/^[0-9]+(\.[0-9]+)*(-[a-zA-Z0-9.-]+)?$/.test(version)) {
      throw new Error(`Invalid version: ${version}`);
    }

    const tag = `${prefix}${version}`;

    // 1. Commit regular changes first
    if (git("status", "--porcelain")) {
      git("add", "-A");
      if (git("diff", "--cached", "--name-only")) {
        git("commit", "-m", commitMessage(version));
      }
    } else {
      console.log("No changes to commit.");
    }

    // 2. Prepare templates
    console.log("Preparing templates...");
    sync.prepare();
    prepared = true;

    // 3. Explicitly force-add each scaffolder path to ensure untracked directories & files are staged
    for (const pattern of SCAFFOLDERS) {
      // e.g., "scafy/templates/*" -> "scafy/templates"
      const targetDir = path.dirname(pattern.replace(/\/\*$/, ""));
      try {
        git("add", "-f", targetDir);
      } catch (e) {
        // Fallback to general add if path resolution varies
        git("add", "-f", ".");
      }
    }

    // Double check with general add to catch any other generated files
    git("add", "-A");

    if (git("diff", "--cached", "--name-only")) {
      console.log("Committing prepared templates for release...");
      git("commit", "-m", `chore: prepare templates for ${version}`);
    } else {
      console.log("Warning: No template files were detected for staging.");
    }

    // 4. Tag and push
    console.log(`Creating tag ${tag}...`);
    git("tag", tag);
    git("push", remote, "HEAD");
    git("push", remote, tag);

    console.log(`Successfully released tag: ${tag}`);
    return tag;

  } finally {
    try {
      if (prepared) {
        console.log("Restoring templates...");
        sync.restore();
      }
    } finally {
      rl.close();
    }
  }
}

release({ name: "workflow" });