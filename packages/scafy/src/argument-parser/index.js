export function getSupportedLanguagesFromTemplates(templates = {}) {
  return Object.entries(templates).reduce((acc, [type, langsMap]) => {
    acc[type] = Object.keys(langsMap || {});
    return acc;
  }, {});
}

export function getFlag(args, ...names) {
  const index = args.findIndex((arg) => names.includes(arg));
  if (index === -1) return undefined;
  const value = args[index + 1];
  return !value || value.startsWith("-") ? true : value;
}

export function getProjectNameFromArgs(args) {
  const flagNames = ["--type", "-t", "--lang", "--language", "-l"];
  return args.find((arg, index) => {
    if (arg.startsWith("-")) return false;
    return !flagNames.includes(args[index - 1]);
  });
}

export function validateProjectName(value) {
  if (!value || !value.trim()) return "Project name is required.";
  if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
    return "Project name can only contain letters, numbers, hyphens, and underscores.";
  }
  return true;
}

export function resolveTemplate(projectType, language, templatesMap = {}) {
  const typeEntry = templatesMap[projectType];

  if (typeof typeEntry === "string") return typeEntry;

  const template = typeEntry?.[language];
  if (!template) {
    throw new Error(
      `No template resolved for type: "${projectType}"${
        language ? ` + lang: "${language}"` : ""
      }.`
    );
  }
  return template;
}

export function parseArgs(args) {
  return {
    projectName: getProjectNameFromArgs(args),
    projectType: getFlag(args, "--type", "-t"),
    language: getFlag(args, "--lang", "--language", "-l"),
    git: getFlag(args, "--git", "-g"),
  };
}