#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createTemplateSync } from "@zikojs/workflow";

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

    // 1. Commit regular changes
    if (git("status", "--porcelain")) {
      git("add", ".");
      if (git("diff", "--cached", "--name-only")) {
        git("commit", "-m", commitMessage(version));
      }
    } else {
      console.log("No changes to commit.");
    }

    // 2. Prepare templates
    sync.prepare();
    prepared = true;

    // 3. Stage ONLY the specific scaffolder template directories (safely avoiding node_modules)
    for (const pattern of SCAFFOLDERS) {
      // Convert glob pattern like "scafy/templates/*" to the root directory path "scafy/templates"
      const targetDir = pattern.replace(/\/\*$/, "");
      try {
        git("add", targetDir);
      } catch (e) {
        // Ignore if path doesn't exist
      }
    }

    if (git("diff", "--cached", "--name-only")) {
      git("commit", "-m", `chore: prepare templates for ${version}`);
    } else {
      console.log("No template changes to commit.");
    }

    git("tag", tag);
    git("push", remote, "HEAD");
    git("push", remote, tag);

    console.log(`Released tag: ${tag}`);
    return tag;

  } finally {
    try {
      if (prepared) {
        sync.restore();
      }
    } finally {
      rl.close();
    }
  }
}

release({ name: "workflow" });