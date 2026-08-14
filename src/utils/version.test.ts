import { compareVersions, isNativeSSHSupported, isNewerVersion } from "./version.js";

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
  { version: "0.60.0+enterprise.1", shouldSupport: true, desc: "enterprise build" },
  { version: "0.59.9+enterprise.1", shouldSupport: false, desc: "old enterprise build" },
  { version: "0.76.3-31256681241", shouldSupport: true, desc: "CI build suffix" },
];

let failures = 0;
sshTestCases.forEach(({ version, shouldSupport, desc }) => {
  const result = isNativeSSHSupported(version);
  const status = result === shouldSupport ? "✓" : "✗";
  if (result !== shouldSupport) failures++;
  const label = desc ? `${version.padEnd(22)} (${desc})` : version.padEnd(22);
  console.log(
    `${status} ${label} → ${result.toString().padStart(5)} (expected: ${shouldSupport})`,
  );
});

console.log("\n=== Testing compareVersions (version >= minVersion) ===");
const compareTestCases = [
  { version: "0.60.0", min: "0.60.0", expected: true },
  { version: "0.60.1", min: "0.60.0", expected: true },
  { version: "0.59.9", min: "0.60.0", expected: false },
  // Suffixed builds must compare on the release only — the trailing build
  // number is not a fourth release component.
  { version: "0.60.0-beta.1", min: "0.60.1", expected: false, desc: "pre-release vs newer patch" },
  { version: "0.60.0+enterprise.1", min: "0.60.1", expected: false, desc: "enterprise vs newer patch" },
  { version: "0.77.0+enterprise.1", min: "0.77.0", expected: true, desc: "enterprise build metadata ignored" },
];

compareTestCases.forEach(({ version, min, expected, desc }) => {
  const result = compareVersions(version, min);
  const status = result === expected ? "✓" : "✗";
  if (result !== expected) failures++;
  const label = `${version} >= ${min}`.padEnd(38);
  console.log(
    `${status} ${label}${desc ? ` (${desc})` : ""} → ${result.toString().padStart(5)} (expected: ${expected})`,
  );
});

console.log("\n=== Testing isNewerVersion (update available) ===");
const updateTestCases = [
  // The shape enterprise/cloud installations report: same release, plus a build
  // tag. Not an update.
  { current: "0.77.0+enterprise.1", latest: "0.77.0", expected: false, desc: "enterprise build, same release" },
  { current: "0.77.0+enterprise.1", latest: "0.77.1", expected: true, desc: "enterprise build, newer patch" },
  { current: "0.77.0+enterprise.2", latest: "0.76.9", expected: false, desc: "enterprise build, older latest" },
  { current: "0.76.3-31256681241", latest: "0.76.3", expected: false, desc: "CI build suffix" },
  { current: "v2.91.0", latest: "2.91.0", expected: false, desc: "v prefix on one side" },
  { current: "development", latest: "0.77.0", expected: false, desc: "development build" },
  { current: "0.77.0", latest: "", expected: false, desc: "unknown latest" },
];

updateTestCases.forEach(({ current, latest, expected, desc }) => {
  const result = isNewerVersion(current, latest);
  const status = result === expected ? "✓" : "✗";
  if (result !== expected) failures++;
  const label = `${current || "(empty)"} → ${latest || "(empty)"}`.padEnd(38);
  console.log(
    `${status} ${label}${desc ? ` (${desc})` : ""} → ${result.toString().padStart(5)} (expected: ${expected})`,
  );
});

console.log(`\n${failures} test(s) failed`);
process.exit(failures > 0 ? 1 : 0);
