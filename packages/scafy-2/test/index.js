#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createScaffolder } from '../src/index.js';
import pc from 'picocolors';

const languages = {
  js: pc.yellowBright("JavaScript"),
  ts: pc.blueBright("TypeScript"),
  jsx: pc.cyanBright("JSX"),
  tsx: pc.magentaBright("TSX"),
};


const cli = createScaffolder({
  languages,
  templatesDir: "../templates", // Relative to the consumer CLI file
  presets: [
    { label: "Single Page App", name: "spa", languages: ["js", "ts", "jsx", "tsx"] },
    { label: "Single Page App — File-based Router", name: "fbr", languages: ["js", "ts", "jsx"] },
    { label: "Server-Side Rendering", name: "ssr", languages: ["js", "ts"] },
    {
      label: "Extra",
      name: "extra",
      action: async (config, { targetDir }) => {
        console.log(`\n${pc.yellow("Executing custom setup script...")}\n`);
      },
    },
  ],
});

cli.run();