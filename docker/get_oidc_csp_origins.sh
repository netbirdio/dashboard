#!/bin/bash
# Resolve the OIDC provider's endpoint origins for the CSP's connect-src directive.
# Some providers serve the OIDC endpoints from different origins than the authority,
# so simply using AUTH_AUTHORITY for the CSP blocks the token exchange in some setups.
#
# Reference to #690
#
# Prints space-separated origins to stdout and diagnostics to stderr, always exits 0.

set -u

DISCOVERY_TIMEOUT="${NETBIRD_OIDC_DISCOVERY_TIMEOUT:-5}"

if [[ "${NETBIRD_OIDC_DISCOVERY:-true}" != "true" ]]; then
    echo "OIDC discovery disabled, skipping CSP origin detection" >&2
    exit 0
fi

if [[ -z "${AUTH_AUTHORITY:-}" ]]; then
    echo "AUTH_AUTHORITY unset, skipping OIDC discovery" >&2
    exit 0
fi

DISCOVERY_URL="${AUTH_AUTHORITY%/}/.well-known/openid-configuration"

if ! DOC=$(curl -fsS --max-time "$DISCOVERY_TIMEOUT" "$DISCOVERY_URL" 2>/dev/null); then
    echo "OIDC discovery failed for ${DISCOVERY_URL}, falling back to AUTH_AUTHORITY only" >&2
    exit 0
fi

ENDPOINTS=$(printf '%s' "$DOC" | jq -r '
    .token_endpoint, .jwks_uri, .userinfo_endpoint, .revocation_endpoint
    | select(type == "string")' 2>/dev/null) || {
    echo "OIDC discovery document from ${DISCOVERY_URL} is not valid JSON, ignoring" >&2
    exit 0
}

# Values come from a remote server and land in an nginx directive, so keep only
# well-formed URLs and strip them to their origin
ORIGINS=$(printf '%s\n' "$ENDPOINTS" \
    | grep -E '^https?://[A-Za-z0-9._-]+(:[0-9]+)?(/|$)' \
    | sed -E 's|^(https?://[^/]+).*|\1|' \
    | sort -u \
    | tr '\n' ' ')

ORIGINS="${ORIGINS% }"

if [[ -z "$ORIGINS" ]]; then
    echo "OIDC discovery returned no usable endpoints, falling back to AUTH_AUTHORITY only" >&2
    exit 0
fi

echo "OIDC discovery resolved CSP origins: ${ORIGINS}" >&2
printf '%s' "$ORIGINS"