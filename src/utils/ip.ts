import { Address4, Address6 } from "ip-address";

export function isIPv6(value: string): boolean {
  const bare = value.split("/")[0];
  return bare.includes(":") && Address6.isValid(bare);
}

export function isIPv4(value: string): boolean {
  const bare = value.split("/")[0];
  return !bare.includes(":") && Address4.isValid(bare);
}

// isValidIP reports whether value is a valid IPv4 or IPv6 address. A CIDR
// suffix is allowed and, when present, validated along with the address.
export function isValidIP(value: string): boolean {
  if (!value) return false;
  return value.includes(":")
    ? Address6.isValid(value)
    : Address4.isValid(value);
}

// isValidCIDR reports whether value is a valid network in CIDR notation. A bare
// address carrying no "/" suffix is rejected.
export function isValidCIDR(value: string): boolean {
  if (!value || !value.includes("/")) return false;
  return isValidIP(value);
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

// parseCIDR parses a network string into an ip-address object, or returns null
// when the value is not a valid network.
export function parseCIDR(value: string): Address4 | Address6 | null {
  try {
    if (isIPv6(value)) return new Address6(value);
    if (isIPv4(value)) return new Address4(value);
    return null;
  } catch {
    return null;
  }
}

// isHostInCIDR reports whether host falls within network. A host from a
// different address family is never considered inside the network.
export function isHostInCIDR(
  host: string,
  network: Address4 | Address6,
): boolean {
  try {
    if (network instanceof Address6) {
      return isIPv6(host) && new Address6(host).isInSubnet(network);
    }
    return isIPv4(host) && new Address4(host).isInSubnet(network);
  } catch {
    return false;
  }
}

// wrapIPv6 wraps a bare IPv6 host in square brackets for use in URL/host:port
// contexts. Bracketed IPv6 ("[...]"), IPv4, and hostnames are returned as-is.
export function wrapIPv6(host: string): string {
  if (!host || host.startsWith("[")) return host;
  return isIPv6(host) ? `[${host}]` : host;
}
