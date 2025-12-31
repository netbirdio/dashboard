export interface GoogleWorkspaceIntegration {
  id: string;
  customerId: string;
  syncInterval: number;
  enabled: boolean;
  group_prefixes: string[];
  user_group_prefixes: string[];
}

export interface AzureADIntegration {
  id: string;
  clientId: string;
  tenantId: string;
  syncInterval: number;
  enabled: boolean;
  group_prefixes: string[];
  user_group_prefixes: string[];
}

export interface OktaIntegration {
  id: string;
  enabled: boolean;
  group_prefixes: string[];
  user_group_prefixes: string[];
  auth_token: string;
}

export interface IdentityProviderLog {
  id: number;
  level: string;
  timestamp: Date;
}

export type SSOIdentityProviderType =
  | "oidc"
  | "zitadel"
  | "entra"
  | "google"
  | "okta"
  | "pocketid"
  | "microsoft";

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
