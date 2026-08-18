// Structural PII redacted from typed text before it leaves the browser.
// These catch values that identify themselves by shape alone, so they work
// even for data the dashboard never loaded; account-specific names are the
// catalog's job. Applied in order, and order matters:
//  - secrets first, since a JWT, PEM block or credential URL contains runs
//    the narrower patterns below would tear apart;
//  - MAC before IPv6, since a MAC is also a valid-looking hex-group run;
//  - CIDR before bare address, so the prefix length isn't left dangling.
// Curated for what people paste at a NetBird assistant — setup.env files,
// docker-compose, DSNs, curl commands, logs, tickets. Deliberately no bare
// domains, hostnames or person names: those have no reliable shape, and
// false positives mangle questions. Also deliberately NOT excluded: private
// and CGNAT ranges — 100.64.0.0/10 is exactly where peer IPs live. Config
// idioms that identify nothing (0.0.0.0, 127.0.0.1, 0.0.0.0/0) pass through.

const IPV6 =
  "(?:[0-9A-Fa-f]{1,4}:){3,7}[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,6}:(?:[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){0,5})?";

const OCTET = "(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)";
const IPV4 = `${OCTET}(?:\\.${OCTET}){3}`;

export const PII_PATTERNS: readonly (readonly [string, RegExp])[] = [
  [
    "key",
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  ],
  // SSH public keys: the base64 body can embed hardware-derived material.
  [
    "key",
    /\b(?:ssh-(?:rsa|ed25519|dss)|ecdsa-sha2-nistp\d{3})\s+[A-Za-z0-9+/]{40,}={0,3}/g,
  ],
  // JWTs: three base64url segments, header always starts with eyJ.
  ["key", /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{6,}\b/g],
  // NetBird personal access tokens.
  ["key", /\bnbp_[A-Za-z0-9]{8,}\b/g],
  // Common vendor credentials pasted from configs and shell history.
  [
    "key",
    /\b(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|(?:sk|pk|rk)_(?:live|test)_[0-9a-zA-Z]{24,}|npm_[A-Za-z0-9]{36}|pypi-[A-Za-z0-9_-]{50,}|SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}|SK[a-f0-9]{32}|key-[a-f0-9]{32})\b/g,
  ],
  [
    "key",
    /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+/g,
  ],
  // Any URL with embedded credentials, DB DSNs included
  // (postgres://user:pass@host — the whole thing is a secret).
  ["key", /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/"']+:[^\s@/"']+@[^\s"'<>]+/gi],
  // Secret assignments from pasted env files and configs. The value must
  // carry a digit so prose like "the secret: management" can't match.
  [
    "key",
    /\b[\w-]*(?:password|passwd|pwd|secret|token|api[_-]?key|enc[_-]?key|auth[_-]?key|access[_-]?key|account[_-]?key)["']?\s*[=:]\s*["']?(?=[^\s"',;]*\d)[^\s"',;]{8,}/gi,
  ],
  // Opaque bearer tokens from pasted Authorization headers. Runs after the
  // JWT rule, so only non-JWT tokens land here.
  ["key", /\bBearer\s+[A-Za-z0-9~_+/.-]{20,}={0,2}/g],
  // WireGuard keys: exactly 32 bytes of base64 (43 chars + padding).
  [
    "key",
    /(?<![A-Za-z0-9+/=])[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=(?![A-Za-z0-9+/=])/g,
  ],
  // Setup keys and pasted resource ids are UUIDs.
  [
    "uuid",
    /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
  ],
  ["mac", /\b(?:[0-9A-Fa-f]{2}([:-]))(?:[0-9A-Fa-f]{2}\1){4}[0-9A-Fa-f]{2}\b/g],
  ["cidr", new RegExp(`\\b(?!0\\.0\\.0\\.0/0\\b)${IPV4}/\\d{1,2}\\b`, "g")],
  ["cidr", new RegExp(`\\b(?:${IPV6})/\\d{1,3}\\b`, "g")],
  [
    "ip",
    new RegExp(
      `\\b(?!(?:0\\.0\\.0\\.0|127\\.0\\.0\\.1|255\\.255\\.255\\.255)\\b)${IPV4}\\b`,
      "g",
    ),
  ],
  ["ip", new RegExp(`\\b(?:${IPV6})(?:%\\w+)?\\b`, "g")],
  ["email", /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g],
  // Phones: international with leading +, or separated US formats. Anchored
  // shapes only — bare digit runs are ports, ids and version numbers here.
  [
    "phone",
    /(?<![\w+])\+\d{1,3}(?:[\s.-]?\(?\d{1,4}\)?){2,5}\b|\(\d{3}\)\s?\d{3}[-.]\d{4}\b|\b\d{3}[-.]\d{3}[-.]\d{4}\b/g,
  ],
  // Major card brands in 4-4-4-4 or Amex grouping; no Luhn, so prefixes are
  // required to keep random 16-digit runs out.
  [
    "card",
    /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))(?:[ -]?\d{4}){2}[ -]?\d{1,4}\b/g,
  ],
  ["ssn", /\b\d{3}-\d{2}-\d{4}\b/g],
  ["iban", /\b[A-Z]{2}\d{2}[A-Za-z0-9]{11,30}\b/g],
];
