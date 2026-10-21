#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import inquirer from "inquirer";
import pc from "picocolors";

import {
  detectPackageManager,
  installDependencies,
  initGitRepository,
  isDirectoryEmpty,
  copyDirectory,
  updatePackageJsonName,
  handleExistingDirectory,
} from "./fs-utils/index.js";

import {
  getSupportedLanguagesFromTemplates,
  getFlag,
  getProjectNameFromArgs,
  validateProjectName,
  resolveTemplate,
  parseArgs,
} from "./argument-parser/index.js";

// DEFAULT CONFIGURATIONS

export const DEFAULT_LANGUAGE_NAMES = {
  js: pc.yellowBright("JavaScript"),
  ts: pc.blueBright("TypeScript"),
  jsx: pc.cyanBright("JSX"),
  tsx: pc.magentaBright("TSX"),
};

// FILE SYSTEM & SHELL UTILITIES

export const DEFAULT_UTILS = {
  installDependencies,
  initGitRepository,
  isDirectoryEmpty,
  copyDirectory,
  handleExistingDirectory,
  updatePackageJsonName,
};

// PATH RESOLUTION UTILITY

function getCallerDir() {
  const originalPrepareStackTrace = Error.prepareStackTrace;
  try {
    Error.prepareStackTrace = (_, stack) => stack;
    const err = new Error();
    const stack = err.stack;
    Error.prepareStackTrace = originalPrepareStackTrace;

    const currentFile = fileURLToPath(import.meta.url);
    for (const frame of stack) {
      const fileName = frame.getFileName();
      if (fileName && fileName.startsWith("file://")) {
        const parsedPath = fileURLToPath(fileName);
        if (parsedPath !== currentFile) {
          return path.dirname(parsedPath);
        }
      }
    }
  } catch {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
  return process.cwd();
}

// HELPER: Convert presets array into templates mapping
function buildTemplatesMap(presets = []) {
  const templatesMap = {};

  for (const item of presets) {
    if (!item.name || item.action) continue;

    templatesMap[item.name] = {};

    if (Array.isArray(item.languages)) {
      for (const lang of item.languages) {
        templatesMap[item.name][lang] = `${item.name}-${lang}`;
      }
    } else if (typeof item.languages === "object" && item.languages !== null) {
      templatesMap[item.name] = item.languages;
    }
  }

  return templatesMap;
}

// PROMPT ENGINE

export async function getProjectConfig(rawArgs = process.argv.slice(2), configOptions = {}) {
  const {
    presets = [],
    languages = DEFAULT_LANGUAGE_NAMES,
    defaultProjectName = "my-app",
    templatesMap = {},
  } = configOptions;

  const supportedLanguages = getSupportedLanguagesFromTemplates(templatesMap);
  let { projectName, projectType, language, git } = parseArgs(rawArgs);

  // 1. Project Name Prompt
  if (!projectName) {
    ({ projectName } = await inquirer.prompt([
      {
        type: "input",
        name: "projectName",
        message: "Project name:",
        default: defaultProjectName,
        validate: validateProjectName,
      },
    ]));
  } else {
    const error = validateProjectName(projectName);
    if (error !== true) throw new Error(error);
  }

  // 2. Preset Selection Prompt
  if (!projectType && presets.length > 0) {
    ({ projectType } = await inquirer.prompt([
      {
        type: "select",
        name: "projectType",
        message: "Select a preset:",
        choices: presets.map((p) => ({
          name: p.label || p.name,
          value: p.name,
        })),
      },
    ]));
  }

  // Find the selected preset definition object by name
  const selectedPresetObj = presets.find((p) => p.name === projectType);
  if (presets.length > 0 && !selectedPresetObj) {
    throw new Error(`Invalid preset selected: ${projectType}`);
  }

  // IF preset has a custom action, skip language selection
  if (selectedPresetObj?.action) {
    return { projectName, projectType, language: null, git: false, install: false };
  }

  // 3. Language Prompt (standard template flow)
  const validLanguages = supportedLanguages[projectType] || [];
  if (validLanguages.length > 0) {
    const languageChoices = validLanguages.map((val) => ({
      name: languages[val] || val,
      value: val,
    }));

    if (!language) {
      ({ language } = await inquirer.prompt([
        {
          type: "select",
          name: "language",
          message: "Language:",
          choices: languageChoices,
        },
      ]));
    } else if (!validLanguages.includes(language)) {
      throw new Error(`Language "${language}" is not supported for ${projectType}.`);
    }
  } else {
    language = null;
  }

  // 4. Git Prompt
  if (git === undefined) {
    ({ git } = await inquirer.prompt([
      {
        type: "confirm",
        name: "git",
        message: "Initialize a new Git repository?",
        default: true,
      },
    ]));
  }

  // 5. Install Prompt
  const { install } = await inquirer.prompt([
    {
      type: "confirm",
      name: "install",
      message: "Install dependencies?",
      default: true,
    },
  ]);

  return { projectName, projectType, language, git, install };
}

// GENERATOR CORE LOGIC

export function copyTemplates(templateName, targetDir, templatesDir, options = {}) {
  const { sharedDirName = "shared", copyDirFn = copyDirectory } = options;
  const sharedTemplate = path.join(templatesDir, sharedDirName);
  const targetTemplateDir = path.join(templatesDir, templateName);

  if (fs.existsSync(sharedTemplate)) {
    copyDirFn(sharedTemplate, targetDir);
  }

  if (fs.existsSync(targetTemplateDir)) {
    copyDirFn(targetTemplateDir, targetDir);
  } else {
    throw new Error(`Template directory "${targetTemplateDir}" does not exist.`);
  }
}

export async function createProject(config, options = {}) {
  const {
    templatesDir,
    templatesMap = {},
    presets = [],
    utils = {},
    hooks = {},
  } = options;

  const activeUtils = { ...DEFAULT_UTILS, ...utils };
  const { projectName, projectType, language, git, install } = config;

  if (hooks.beforeCreate) await hooks.beforeCreate(config);

  const targetDir = path.resolve(process.cwd(), projectName);
  const selectedPresetObj = presets.find((p) => p.name === projectType);

  // Prepare target directory
  const directoryMode = await activeUtils.handleExistingDirectory(targetDir);
  if (directoryMode === "ignore") {
    console.log(`\n${pc.dim("Existing files will be preserved.")}`);
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // --- CUSTOM ACTION BRANCH ---
  if (selectedPresetObj?.action) {
    await selectedPresetObj.action(config, { targetDir, utils: activeUtils });
    if (hooks.afterCreate) await hooks.afterCreate(config, { targetDir });
    return;
  }

  // --- STANDARD TEMPLATE BRANCH ---
  const template = resolveTemplate(projectType, language, templatesMap);

  console.log(`\n${pc.dim("Creating project...")}`);
  console.log(`${pc.dim("Template:")} ${pc.cyan(template)}`);
  console.log(`${pc.dim("Location:")} ${pc.cyan(targetDir)}`);

  copyTemplates(template, targetDir, templatesDir, {
    copyDirFn: activeUtils.copyDirectory,
  });

  activeUtils.updatePackageJsonName(targetDir, projectName);

  console.log(`\n${pc.green("✓")} Project created successfully!`);

  if (git) {
    activeUtils.initGitRepository(targetDir);
  }

  if (install) {
    const pkgManager = detectPackageManager();
    activeUtils.installDependencies(targetDir, pkgManager);
    console.log(`\n${pc.green("✓")} Dependencies installed!`);
  }

  if (hooks.afterCreate) await hooks.afterCreate(config, { targetDir });

  const pkgManager = detectPackageManager();
  const runCmd = pkgManager === "npm" ? "npm run dev" : `${pkgManager} dev`;

  console.log(`\n${pc.dim("Next steps:")}`);
  console.log(`  ${pc.cyan(`cd ${projectName}`)}`);
  if (!install) console.log(`  ${pc.cyan(`${pkgManager} install`)}`);
  console.log(`  ${pc.cyan(runCmd)}\n`);
}

// MAIN FACTORY ENTRYPOINT

export function createScaffolder(configOverrides = {}) {
  const {
    languages = DEFAULT_LANGUAGE_NAMES,
    presets = [],
    defaultProjectName = "my-app",
    templatesDir = "../templates",
    utils = {},
    hooks = {},
  } = configOverrides;

  // 1. Build templatesMap from presets
  const templatesMap = buildTemplatesMap(presets);

  // 2. Resolve directory of caller repo
  const callerDir = getCallerDir();
  const resolvedTemplatesDir = path.isAbsolute(templatesDir)
    ? templatesDir
    : path.resolve(callerDir, templatesDir);

  const resolvedUtils = { ...DEFAULT_UTILS, ...utils };

  const configOptions = {
    templatesMap,
    presets,
    languages,
    defaultProjectName,
  };

  return {
    async run(args = process.argv.slice(2)) {
      try {
        const config = await getProjectConfig(args, configOptions);

        await createProject(config, {
          templatesDir: resolvedTemplatesDir,
          templatesMap,
          presets,
          utils: resolvedUtils,
          hooks,
        });
      } catch (error) {
        if (error?.name === "ExitPromptError") {
          console.log(`\n${pc.dim("Cancelled.")}`);
          process.exit(0);
        }
        console.error(`\n${pc.red("✖")} ${error.message}\n`);
        process.exit(1);
      }
    },
  };
}