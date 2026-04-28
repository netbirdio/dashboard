import { CredentialProviderType } from "@/interfaces/Credential";

// Per-provider input field schema for the certificate tab. Each
// provider declares its required and optional input fields; the form
// renders the field set dynamically based on the selected provider.
//
// Keep in sync with the proxy-side adapter registry at
// netbird/proxy/internal/acme/legoclient/providers.go.

export type ProviderFieldSchema = {
  // Key under `secret_fields` on the credential POST. Must match the
  // backend adapter's expected key (e.g., "auth_token", "tsig_secret").
  key: string;
  label: string;
  // password-style masked input?
  masked: boolean;
  required: boolean;
  // Helper text shown under the input.
  helper?: string;
  // Placeholder hint inside the input.
  placeholder?: string;
};

export type ProviderSchema = {
  id: CredentialProviderType;
  label: string;
  description: string;
  fields: ProviderFieldSchema[];
  // Per-provider scope warning shown only when CredentialPicker is
  // rendered with scopeContext="auto-configure". Cert issuance via
  // DNS-01 needs a narrower scope (write to _acme-challenge.<zone>);
  // auto-configure needs to write a CNAME at *.<zone>, which most
  // providers express as a much broader permission. The dashboard
  // surfaces this so users don't reuse a Phase-1-scoped token and
  // hit a 403 at write time.
  autoConfigureScopeHelper?: string;
};

export const dnsProviders: ReadonlyArray<ProviderSchema> = [
  {
    id: "cloudflare",
    label: "Cloudflare",
    description: "Verified via Cloudflare API token (Zone:DNS:Edit).",
    autoConfigureScopeHelper:
      "Auto-configure needs a Cloudflare API token with Zone:DNS:Edit on the target zone (not just the _acme-challenge subdomain). The token will be used to create, read, and delete records anywhere in the zone.",
    fields: [
      {
        key: "auth_token",
        label: "API Token",
        masked: true,
        required: true,
        helper:
          "A scoped token with Zone:DNS:Edit on the target zone. Don't use the global API key.",
        placeholder: "cf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      },
    ],
  },
  {
    id: "route53",
    label: "AWS Route 53",
    description: "Verified via AWS IAM credentials.",
    autoConfigureScopeHelper:
      "Auto-configure needs an IAM credential with route53:ListHostedZones, route53:ListResourceRecordSets, and route53:ChangeResourceRecordSets on the hosted zone — broader than the cert-issuance policy. We recommend scoping the policy to a specific HostedZoneId via the optional Hosted Zone ID field below.",
    fields: [
      {
        key: "access_key_id",
        label: "Access Key ID",
        masked: false,
        required: true,
        placeholder: "AKIAEXAMPLE",
      },
      {
        key: "secret_access_key",
        label: "Secret Access Key",
        masked: true,
        required: true,
      },
      {
        key: "region",
        label: "Region (optional)",
        masked: false,
        required: false,
        helper: "Defaults to AWS_REGION env or eu-central-1.",
        placeholder: "us-east-1",
      },
      {
        key: "hosted_zone_id",
        label: "Hosted Zone ID (optional)",
        masked: false,
        required: false,
        helper: "Forces a specific zone. Auto-detected if empty.",
        placeholder: "Z123456ABCDEF",
      },
      {
        key: "session_token",
        label: "Session Token (optional)",
        masked: true,
        required: false,
        helper: "For temporary STS credentials only.",
      },
    ],
  },
  {
    id: "digitalocean",
    label: "DigitalOcean",
    description: "Verified via DigitalOcean personal access token.",
    autoConfigureScopeHelper:
      "Auto-configure needs a DigitalOcean API token with read+write on Domains. DigitalOcean tokens are not zone-scoped — the token will have access to every domain in your DO account.",
    fields: [
      {
        key: "auth_token",
        label: "API Token",
        masked: true,
        required: true,
        helper: "A personal access token with read+write scope.",
        placeholder: "dop_v1_xxxxxxxxxxxxxxxxxxxxxx",
      },
    ],
  },
  {
    id: "rfc2136",
    label: "RFC 2136 (BIND, PowerDNS, Knot, NSD)",
    description: "Verified via TSIG-secured dynamic DNS update.",
    autoConfigureScopeHelper:
      "Auto-configure uses the same TSIG key as cert issuance. Verify your nameserver's update-policy grants this key permission to write CNAME records (not just TXT). A common mistake is granting `name _acme-challenge.* TXT` only — auto-configure also needs `name *.<zone> CNAME`.",
    fields: [
      {
        key: "nameserver",
        label: "Nameserver",
        masked: false,
        required: true,
        helper: "host:port of the authoritative DNS server.",
        placeholder: "ns1.example.com:53",
      },
      {
        key: "tsig_algorithm",
        label: "TSIG Algorithm",
        masked: false,
        required: true,
        placeholder: "hmac-sha256",
      },
      {
        key: "tsig_key",
        label: "TSIG Key Name",
        masked: false,
        required: true,
        placeholder: "key.example.com.",
      },
      {
        key: "tsig_secret",
        label: "TSIG Secret",
        masked: true,
        required: true,
        helper: "Base64-encoded TSIG key material.",
      },
    ],
  },
];

export function getProviderSchema(id: CredentialProviderType | undefined): ProviderSchema | undefined {
  if (!id) return undefined;
  return dnsProviders.find((p) => p.id === id);
}

// hasNewCredentialPayload reports whether the inline DNS form has at
// least one required field filled. The modal uses this to decide
// whether to POST a fresh /credentials record on save.
export function hasNewCredentialPayload(
  provider: CredentialProviderType | "",
  credentialId: string,
  secretFields: Record<string, string>,
): boolean {
  if (provider === "") return false;
  if (credentialId !== "") return false;
  const schema = getProviderSchema(provider);
  if (!schema) return false;
  return schema.fields.some(
    (f) => f.required && (secretFields[f.key] ?? "") !== "",
  );
}
