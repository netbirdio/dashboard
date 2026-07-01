// parseAddressPort extracts the IP and port from an address string.
// Handles both IPv4 ("1.2.3.4:80") and IPv6 ("[::1]:80" or "::1") formats.
export function parseAddressPort(address?: string): {
  ip: string;
  port: string | undefined;
} {
  if (!address) return { ip: "", port: undefined };

  // IPv6 with brackets: [::1]:port
  const bracketMatch = address.match(/^\[(.+)\]:(\d+)$/);
  if (bracketMatch) {
    return { ip: bracketMatch[1], port: bracketMatch[2] };
  }

  // IPv4: 1.2.3.4:port (exactly one colon for port separator)
  const lastColon = address.lastIndexOf(":");
  if (lastColon !== -1 && address.indexOf(":") === lastColon) {
    return {
      ip: address.slice(0, lastColon),
      port: address.slice(lastColon + 1),
    };
  }

  // Bare IPv6 or address without port
  return { ip: address, port: undefined };
}

// stripZeroPort returns the address without a trailing ":0" port,
// handling both IPv4 and IPv6 formats.
export function stripZeroPort(address: string): string {
  const { ip, port } = parseAddressPort(address);
  if (port === "0" || port === undefined) return ip;
  return address;
}
