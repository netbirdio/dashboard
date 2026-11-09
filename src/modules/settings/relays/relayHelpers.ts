import { Peer } from "@/interfaces/Peer";
import { Relay, RelayDistribution } from "@/interfaces/Relay";

const HOUR = 60 * 60;

export const DEFAULT_CREDENTIALS_TTL = 24 * HOUR;

export const CREDENTIALS_TTL_OPTIONS = [
  { value: HOUR, label: "1 hour" },
  { value: 6 * HOUR, label: "6 hours" },
  { value: 12 * HOUR, label: "12 hours" },
  { value: 24 * HOUR, label: "24 hours" },
  { value: 7 * 24 * HOUR, label: "7 days" },
];

export const MIN_SECRET_LENGTH = 32;

const RELAY_ADDRESS = /^rels?:\/\/([a-z0-9-]+\.)*[a-z0-9-]+(:\d{1,5})?$/i;

/**
 * Returns a validation message for a relay URL, or an empty string when the
 * address is valid. Only rel:// and rels:// are accepted, since those are the
 * schemes the client dials.
 */
export const relayAddressError = (address: string): string => {
  const value = address.trim();
  if (value === "") return "";
  if (!/^rels?:\/\//i.test(value)) {
    return "Address must start with rels:// (TLS) or rel://";
  }
  if (!RELAY_ADDRESS.test(value)) {
    return "Please enter a valid address, e.g. rels://relay.example.com:443";
  }
  const port = value.split(":")[2];
  if (port !== undefined && (Number(port) < 1 || Number(port) > 65535)) {
    return "Port must be between 1 and 65535";
  }
  return "";
};

export const isInsecureRelayAddress = (address: string) =>
  /^rel:\/\//i.test(address.trim());

export const secretError = (secret: string, required: boolean): string => {
  if (secret === "") return required ? "Auth secret is required" : "";
  if (secret.length < MIN_SECRET_LENGTH) {
    return `Use at least ${MIN_SECRET_LENGTH} characters`;
  }
  return "";
};

export const formatCredentialsTTL = (seconds: number): string => {
  const option = CREDENTIALS_TTL_OPTIONS.find((o) => o.value === seconds);
  if (option) return option.label;
  if (seconds % (24 * HOUR) === 0) return `${seconds / (24 * HOUR)} days`;
  if (seconds % HOUR === 0) return `${seconds / HOUR} hours`;
  return `${Math.round(seconds / 60)} minutes`;
};

/** Generates a random secret in the URL-safe base64 alphabet. */
export const generateRelaySecret = (bytes = 32): string => {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export const isDistributionEmpty = (distribution: RelayDistribution) =>
  distribution.groups.length === 0 && distribution.locations.length === 0;

/** Whether a peer is covered by a distribution: any group or any country. */
export const peerMatchesDistribution = (
  peer: Pick<Peer, "groups" | "country_code">,
  distribution: RelayDistribution,
): boolean => {
  const inGroup = (peer.groups ?? []).some((g) =>
    distribution.groups.includes(g.id ?? ""),
  );
  if (inGroup) return true;
  if (!peer.country_code) return false;
  return distribution.locations.some(
    (l) => l.country_code.toUpperCase() === peer.country_code.toUpperCase(),
  );
};

export type PeerRelayResolution = {
  /** Custom relays the peer receives. Empty means instance relays only. */
  relays: Relay[];
  /** Whether instance relays are also handed out as a fallback. */
  instanceFallback: boolean;
};

/**
 * Mirrors the rule management applies per peer. A peer gets every enabled
 * relay that matches it. Instance relays stay available only when every
 * matched relay allows fallback, so a single "no fallback" relay wins: that
 * setting usually exists for a data-residency reason.
 */
export const resolvePeerRelays = (
  peer: Pick<Peer, "groups" | "country_code">,
  relays: Relay[],
): PeerRelayResolution => {
  const matched = relays.filter(
    (r) => r.enabled && peerMatchesDistribution(peer, r.distribution),
  );
  if (matched.length === 0) return { relays: [], instanceFallback: true };
  return {
    relays: matched,
    instanceFallback: matched.every((r) => r.instance_fallback),
  };
};

export const countMatchingPeers = (
  peers: Pick<Peer, "groups" | "country_code">[] | undefined,
  distribution: RelayDistribution,
) => (peers ?? []).filter((p) => peerMatchesDistribution(p, distribution)).length;

const RELAY_IMAGE = "netbirdio/relay:latest";

/** Docker command to run a relay that accepts credentials for this account. */
export const relayDeployCommand = (address: string, secret: string) => {
  const exposed = address.trim() || "rels://relay.example.com:443";
  const host = exposed.replace(/^rels?:\/\//i, "").split(":")[0];
  const tls = !isInsecureRelayAddress(exposed);
  const lines = [
    "docker run -d --name netbird-relay --restart unless-stopped \\",
    "  -p 443:443 \\",
    "  -e NB_LISTEN_ADDRESS=:443 \\",
    `  -e NB_EXPOSED_ADDRESS=${exposed} \\`,
    `  -e NB_AUTH_SECRET=${secret || "<auth-secret>"} \\`,
  ];
  if (tls) {
    lines.push(`  -e NB_LETSENCRYPT_DOMAINS=${host} \\`);
    lines.push("  -e NB_LETSENCRYPT_DATA_DIR=/data \\");
    lines.push("  -v netbird-relay:/data \\");
  }
  lines.push(`  ${RELAY_IMAGE}`);
  return lines;
};
