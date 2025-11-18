import { isNativeSSHSupported } from "./version.js";

console.log("=== Testing isNativeSSHSupported ===");
const sshTestCases = [
  { version: "v0.59.9", shouldSupport: false },
  { version: "v0.59.10", shouldSupport: false },
  { version: "v0.59.11", shouldSupport: false },
  { version: "v0.60.0", shouldSupport: true },
  { version: "v0.60.1", shouldSupport: true },
  { version: "v0.61.0", shouldSupport: true },
  { version: "v1.0.0", shouldSupport: true },

  // Edge cases
  { version: "development", shouldSupport: true, desc: "development build" },
  { version: "0.60.0", shouldSupport: true, desc: "no v prefix" },
  { version: "0.59.11", shouldSupport: false, desc: "no v prefix" },
  { version: "v0.60.0-beta", shouldSupport: true, desc: "with suffix" },
  { version: "v0.60.0-rc1", shouldSupport: true, desc: "with rc suffix" },
  { version: "v0.59.9-beta", shouldSupport: false, desc: "old version with suffix" },
];

let failures = 0;
sshTestCases.forEach(({ version, shouldSupport, desc }) => {
  const result = isNativeSSHSupported(version);
  const status = result === shouldSupport ? "✓" : "✗";
  if (result !== shouldSupport) failures++;
  const label = desc ? `${version.padEnd(15)} (${desc})` : version.padEnd(15);
  console.log(
    `${status} ${label} → ${result.toString().padStart(5)} (expected: ${shouldSupport})`,
  );
});

console.log(`\n${failures} test(s) failed`);
process.exit(failures > 0 ? 1 : 0);
