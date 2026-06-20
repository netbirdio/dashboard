export interface GoogleWorkspaceIntegration {
  id: string;
  customer_id: string;
  sync_interval: number;
  enabled: boolean;
  group_prefixes: string[];
  user_group_prefixes: string[];
  connector_id?: string;
}

export interface AzureADIntegration {
  id: string;
  client_id: string;
  tenant_id: string;
  sync_interval: number;
  enabled: boolean;
  group_prefixes: string[];
  user_group_prefixes: string[];
  connector_id?: string;
}

export interface OktaIntegration {
  id: string;
  enabled: boolean;
  group_prefixes: string[];
  user_group_prefixes: string[];
  auth_token: string;
  connection_name?: string;
  connector_id?: string;
}

export interface ScimIntegration {
  id: string;
  provider: IdentityProvider;
  enabled: boolean;
  group_prefixes: string[];
  user_group_prefixes: string[];
  auth_token: string;
  last_synced_at?: Date;
  connector_id?: string;
}

export interface IdentityProviderLog {
  id: number;
  level: string;
  timestamp: Date;
}

export interface EnterpriseConnection {
  id: string;
  enabled: boolean;
  name: string;
  strategy: string;
  discovery_domain: string;
  client_id: string;
  scopes: string[];
  domains: EnterpriseConnectionDomain[];
}

export interface EnterpriseConnectionDomain {
  name: string;
  validation_token: string;
  validation_status: DomainValidationStatus;
  validation_last_updated: Date;
}

export enum DomainValidationStatus {
  PENDING = "pending",
  VERIFIED = "verified",
  FAILED = "failed",
}

export interface SSOConnection {
  id: string;
  strategy: string;
  provider: string;
  name: string;
}

export enum IdentityProvider {
  GENERIC = "generic",
  JUMPCLOUD = "jumpcloud",
  ENTRA = "entra",
}

export type SSOIdentityProviderType =
  | "oidc"
  | "zitadel"
  | "entra"
  | "google"
  | "okta"
  | "pocketid"
  | "microsoft"
  | "authentik"
  | "keycloak"
  | "adfs";

export const SSOIdentityProviderOptions: {
  value: SSOIdentityProviderType;
  label: string;
}[] = [
  { value: "oidc", label: "OIDC (Generic)" },
  { value: "google", label: "Google" },
  { value: "microsoft", label: "Microsoft" },
  { value: "entra", label: "Microsoft Entra" },
  { value: "okta", label: "Okta" },
  { value: "zitadel", label: "Zitadel" },
  { value: "pocketid", label: "PocketID" },
  { value: "authentik", label: "Authentik" },
  { value: "keycloak", label: "Keycloak" },
  { value: "adfs", label: "Microsoft AD FS" },
];

export const getSSOIdentityProviderLabelByType = (
  type: SSOIdentityProviderType,
) => {
  return (
    SSOIdentityProviderOptions.find((option) => option.value === type)?.label ??
    type
  );
};

export interface SSOIdentityProvider {
  id: string;
  type: SSOIdentityProviderType;
  name: string;
  issuer: string;
  client_id: string;
  redirect_url?: string;
}

export interface SSOIdentityProviderRequest {
  type: SSOIdentityProviderType;
  name: string;
  issuer: string;
  client_id: string;
  client_secret: string;
}
