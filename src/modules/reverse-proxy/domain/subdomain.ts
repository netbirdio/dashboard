// Live input filter. Dots are kept so multi-label subdomains ("dev.app") can
// be typed at all — dot placement is only checked on submit, because an
// anchored check would reject valid in-progress input like "dev." mid-typing.
export function sanitizeSubdomain(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9.-]/g, "");
}

// Dot-separated DNS labels. Empty labels are rejected, so leading/trailing
// dots and consecutive dots ("dev..app") never reach the API.
const SUBDOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/;

// An empty subdomain is valid here; whether one is required at all is a
// separate concern (ReverseProxyDomain.require_subdomain).
export function isValidSubdomain(value: string): boolean {
  return value === "" || SUBDOMAIN_PATTERN.test(value);
}
