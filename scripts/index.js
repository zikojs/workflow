import { createTemplateSync } from "@zikojs/workflow";

const SCAFFOLDERS = [
  "scafy/templates/*",
  // "create-ufbr/templates/*",
];

const sync = createTemplateSync(SCAFFOLDERS);

sync.prepare()
// Between 
setTimeout(()=> sync.restore(), 1000)


// const [command, ...args] = process.argv.slice(2);

// if (!command) {
//   console.error("Usage: node scripts/sync.js <command> [...args]");
//   process.exitCode = 1;
// } else {
//   let restored = false;

//   function restore() {
//     if (restored) return;
//     restored = true;
//     sync.restore();
//   }

//   try {
//     sync.prepare();

//     const child = spawn(command, args, {
//       cwd: root,
//       stdio: "inherit",
//       shell: process.platform === "win32",
//     });

//     child.on("error", (error) => {
//       console.error(error);

//       try {
//         // restore();
//       } catch (restoreError) {
//         console.error(restoreError);
//       }

//       process.exitCode = 1;
//     });

//     child.on("close", (code) => {
//       try {
//         // restore();
//       } catch (error) {
//         console.error(error);
//         process.exitCode = 1;
//         return;
//       }

//       process.exitCode = code ?? 1;
//     });
//   } catch (error) {
//     console.error(error);

//     try {
//     //   restore();
//     } catch (restoreError) {
//       console.error(restoreError);
//     }

//     process.exitCode = 1;
//   }
// }