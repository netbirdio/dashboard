import {
  hostSuffixFor,
  isIPv4,
  isIPv6,
  normalizeHostCIDR,
  wrapIPv6,
} from "./ip.js";

type Case<T> = { input: string; expected: T; desc?: string };

function run<T>(name: string, cases: Case<T>[], fn: (s: string) => T): number {
  console.log(`\n=== ${name} ===`);
  let failures = 0;
  for (const { input, expected, desc } of cases) {
    const actual = fn(input);
    const ok = actual === expected;
    if (!ok) failures++;
    const label = desc ? `${JSON.stringify(input)} (${desc})` : JSON.stringify(input);
    console.log(
      `${ok ? "✓" : "✗"} ${label.padEnd(40)} → ${JSON.stringify(actual)}` +
        (ok ? "" : ` (expected: ${JSON.stringify(expected)})`),
    );
  }
  return failures;
}

let failures = 0;

failures += run<boolean>("isIPv4", [
  { input: "10.0.0.1", expected: true },
  { input: "192.168.1.0", expected: true },
  { input: "10.0.0.1/32", expected: true, desc: "v4 with prefix" },
  { input: "10.0.0.0/24", expected: true, desc: "v4 subnet" },
  { input: "2001:db8::1", expected: false, desc: "v6" },
  { input: "::1", expected: false, desc: "v6 loopback" },
  { input: "service.internal", expected: false, desc: "domain" },
  { input: "*.example.com", expected: false, desc: "wildcard" },
  { input: "", expected: false },
  { input: "not-an-ip", expected: false },
], isIPv4);

failures += run<boolean>("isIPv6", [
  { input: "2001:db8::1", expected: true },
  { input: "::1", expected: true, desc: "loopback" },
  { input: "::", expected: true, desc: "unspecified" },
  { input: "2620:fe::fe", expected: true, desc: "anycast" },
  { input: "2001:db8::1/128", expected: true, desc: "v6 host CIDR" },
  { input: "2001:db8::/64", expected: true, desc: "v6 subnet" },
  { input: "10.0.0.1", expected: false, desc: "v4" },
  { input: "service.internal", expected: false, desc: "domain" },
  { input: "", expected: false },
], isIPv6);

failures += run<string>("normalizeHostCIDR", [
  { input: "10.0.0.1", expected: "10.0.0.1/32", desc: "bare v4 → /32" },
  { input: "2001:db8::1", expected: "2001:db8::1/128", desc: "bare v6 → /128" },
  { input: "2620:fe::fe", expected: "2620:fe::fe/128" },
  { input: "10.0.0.0/24", expected: "10.0.0.0/24", desc: "v4 CIDR unchanged" },
  { input: "2001:db8::/64", expected: "2001:db8::/64", desc: "v6 CIDR unchanged" },
  { input: "10.0.0.1/32", expected: "10.0.0.1/32", desc: "v4 /32 unchanged" },
  { input: "2001:db8::1/128", expected: "2001:db8::1/128", desc: "v6 /128 unchanged" },
  { input: "service.internal", expected: "service.internal", desc: "domain passthrough" },
  { input: "*.example.com", expected: "*.example.com", desc: "wildcard passthrough" },
  { input: "", expected: "" },
  { input: "  10.0.0.1  ", expected: "10.0.0.1/32", desc: "trims whitespace" },
  { input: "not-an-ip", expected: "not-an-ip", desc: "invalid passthrough" },
], normalizeHostCIDR);

failures += run<number | null>("hostSuffixFor", [
  { input: "10.0.0.1", expected: 32 },
  { input: "2001:db8::1", expected: 128 },
  { input: "service.internal", expected: null, desc: "domain" },
  { input: "", expected: null },
], hostSuffixFor);

failures += run<string>("wrapIPv6", [
  { input: "2001:db8::1", expected: "[2001:db8::1]" },
  { input: "2620:fe::fe", expected: "[2620:fe::fe]" },
  { input: "::1", expected: "[::1]" },
  { input: "[2001:db8::1]", expected: "[2001:db8::1]", desc: "already wrapped" },
  { input: "10.0.0.1", expected: "10.0.0.1", desc: "v4 unchanged" },
  { input: "example.com", expected: "example.com", desc: "domain unchanged" },
  { input: "", expected: "", desc: "empty" },
], wrapIPv6);

console.log(`\n${failures} test(s) failed`);
process.exit(failures > 0 ? 1 : 0);
