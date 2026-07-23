// Live input filter, applied on every keystroke. Dots are kept so multi-label
// subdomains ("dev.app") can be typed at all. It deliberately does not check
// dot placement: "dev." is a valid step on the way to "dev.app", so rejecting
// it here would make the field impossible to type in. Shape is checked
// separately by isValidSubdomain.
export function sanitizeSubdomain(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9.-]/g, "");
}

// Dot-separated DNS labels (RFC 1123): each label is alphanumeric at both
// ends, with hyphens allowed only inside. Rejects empty labels, so leading or
// trailing dots and consecutive dots ("dev..app") never reach the API.
const SUBDOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/;

// Drives both the inline error in the input and the submit gate in the modal.
// An empty subdomain is valid here; whether one is required at all is a
// separate concern (ReverseProxyDomain.require_subdomain).
export function isValidSubdomain(value: string): boolean {
  return value === "" || SUBDOMAIN_PATTERN.test(value);
}
