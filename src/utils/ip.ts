import { Address4, Address6 } from "ip-address";

export function isIPv6(value: string): boolean {
  const bare = value.split("/")[0];
  return bare.includes(":") && Address6.isValid(bare);
}

export function isIPv4(value: string): boolean {
  const bare = value.split("/")[0];
  return !bare.includes(":") && Address4.isValid(bare);
}

// normalizeHostCIDR adds a host-suffix (/32 for IPv4, /128 for IPv6) to bare IP
// addresses. Existing CIDR strings and non-IP values are returned unchanged.
export function normalizeHostCIDR(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("/")) return trimmed;
  if (isIPv4(trimmed)) return `${trimmed}/32`;
  if (isIPv6(trimmed)) return `${trimmed}/128`;
  return trimmed;
}

// hostSuffixFor returns the host suffix (32 or 128) for a given address family.
export function hostSuffixFor(value: string): number | null {
  if (isIPv6(value)) return 128;
  if (isIPv4(value)) return 32;
  return null;
}

// wrapIPv6 wraps a bare IPv6 host in square brackets for use in URL/host:port
// contexts. Bracketed IPv6 ("[...]"), IPv4, and hostnames are returned as-is.
export function wrapIPv6(host: string): string {
  if (!host || host.startsWith("[")) return host;
  return isIPv6(host) ? `[${host}]` : host;
}
