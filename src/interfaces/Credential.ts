// TS contract for the management server's /api/credentials surface.
// Hand-maintained alongside ReverseProxy.ts; keep in sync with
// shared/management/http/api/openapi.yml in the netbird repo.

export type CredentialProviderType =
  | "cloudflare"
  | "route53"
  | "digitalocean"
  | "rfc2136";

export interface Credential {
  id: string;
  provider_type: CredentialProviderType;
  name: string;
  created_at: string;
}

// Either `secret` (legacy single string) or `secret_fields` (multi-field
// map) is used. The dashboard always sends `secret_fields`; `secret` is
// retained for compatibility with legacy clients.
export interface CredentialRequest {
  provider_type: CredentialProviderType;
  name: string;
  secret?: string;
  secret_fields?: Record<string, string>;
}

export type ChallengeType = "tls-alpn-01" | "http-01" | "dns-01";

export const CHALLENGE_TYPES: ReadonlyArray<{
  id: ChallengeType;
  label: string;
  description: string;
}> = [
  {
    id: "tls-alpn-01",
    label: "TLS-ALPN-01",
    description: "Default. Validates over the proxy's :443 listener.",
  },
  {
    id: "http-01",
    label: "HTTP-01",
    description: "Validates over a :80 listener.",
  },
  {
    id: "dns-01",
    label: "DNS-01",
    description: "Validates by writing a TXT record at your DNS provider.",
  },
];
