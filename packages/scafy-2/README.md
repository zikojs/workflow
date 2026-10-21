# scafy
An extensible, framework-agnostic engine for building custom create-* CLI scaffolding tools.

## Install

```bash
npm i scafy
```
   
## Usage

```js 
import { createScaffolder } from 'scafy';

const languages = {
  js: pc.yellowBright("JavaScript"),
  ts: pc.blueBright("TypeScript"),
  jsx: pc.cyanBright("JSX"),
  tsx: pc.magentaBright("TSX"),
};
const presets = [
  { name: "spa", label: "Single Page App", languages : ['js', 'ts', 'jsx', 'tsx']},
  { name: "fbr", label: "Single Page App — File-based Router", languages : ['js', 'ts', 'jsx']},
  { name: "ssr", label: "Server-Side Rendering", languages : ['js', 'ts', 'jsx']},
  {
    name: "extra",
    label: "Extra",
    // Custom action executed instead of standard template copying
    action: async (config, { targetDir }) => {
      console.log(`\n${pc.yellow("Executing custom setup script...")}\n`);
      // Run custom shell command, clone a remote git repo, or execute custom logic
      // e.g., execSync("git clone https://github.com/my-org/extra-template.git .", { cwd: targetDir });
    },
  },
];
createScaffolder({
  languages,
  presets,
}).run()
```

## Key Features

- Universal Package Manager Support: Auto-detects `npm`, `pnpm`, `yarn`, and `bun` environments seamlessly.
- Flexible Project Routing: Support both folder-based template copying and custom script/action execution.
- Smart Prompt Engine: Out-of-the-box interactive CLI prompts with clean argument parsing fallback.
- Custom Extensibility: Lifecycle hooks (beforeCreate, afterCreate) and custom utility overrides.
- Framework Agnostic: Works for React, Vue, Svelte, Node, Monorepos,  or pure shell script generators.

# Licence 
MIT