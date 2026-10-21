const colors = {
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m",
};

export function Log(pckg) {
  console.log(`${colors.green}${pckg}${colors.reset}`);
}

export function PrepreLog(pckg) {
  console.log(
    `${colors.green}✓ Prepared : ${colors.reset}${colors.blue}${pckg}${colors.reset}`
  );
}

export function RestoreLog(pckg) {
  console.log(
    `${colors.yellow}✓ Restored : ${colors.reset}${colors.blue}${pckg}${colors.reset}`
  );
}