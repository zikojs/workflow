#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import {
  createTemplateSync
} from '@zikojs/workflow';

const SCAFFOLDERS = [
  "scafy/templates/*",
  // "create-ufbr/templates/*",
];

const sync = createTemplateSync(SCAFFOLDERS);

export async function release({
  name,
  remote = "origin",
  prefix = `${name}-v`,
  commitMessage = (version) => `chore: release ${version}`,
} = {}) {
  if (!name) {
    throw new Error("Release name is required.");
  }

  const rl = createInterface({ input: stdin, output: stdout });

  function git(...args) {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["inherit", "pipe", "inherit"],
    }).trim();
  }

  let synced = false;

  try {
    const version = await rl.question(
      "Enter release version (e.g. 1.0.0 or 1.0.0.1): "
    );

    if (!/^[0-9]+(\.[0-9]+)*(-[a-zA-Z0-9.-]+)?$/.test(version)) {
      throw new Error(`Invalid version: ${version}`);
    }

    const tag = `${prefix}${version}`;

    // 1. Commit any normal user changes first on the current branch
    if (!git("status", "--porcelain")) {
      console.log("No changes to commit.");
    } else {
      git("add", ".");
      git("commit", "-m", commitMessage(version));
    }

    // 2. Prepare templates in the working tree (modifies files for the tag/release)
    console.log("Preparing templates for release tag...");
    await sync.prepare();
    synced = true;

    // 3. Create a temporary commit containing the generated templates
    git("add", ".");
    git("commit", "-m", `temp: template sync for ${version}`);

    // 4. Tag this temporary release commit
    git("tag", tag);

    // 5. Push the tag and push HEAD (the temporary commit) to the remote
    console.log(`Pushing release tag ${tag} and branch...`);
    git("push", remote, tag);
    git("push", remote, "HEAD");

    // 6. Step back one commit locally so your main branch history is untouched
    git("reset", "--mixed", "HEAD~1");

    // 7. Restore templates back to your clean working state
    console.log("Restoring templates...");
    await sync.restore();
    synced = false;

    console.log(`Successfully released tag: ${tag} (with templates included in the tag)`);
    return tag;

  } finally {
    // Fallback cleanup if something unexpected errors out midway
    if (synced) {
      try {
        console.log("Cleaning up/restoring templates...");
        await sync.restore();
      } catch (restoreError) {
        console.error("Failed to restore templates:", restoreError);
      }
    }
    rl.close();
  }
}

release({ name: 'workflow' });