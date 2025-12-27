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

export type IdentityProviderType =
  | "oidc"
  | "zitadel"
  | "entra"
  | "google"
  | "okta"
  | "pocketid"
  | "microsoft";

export interface IdentityProvider {
  id: string;
  type: IdentityProviderType;
  name: string;
  issuer: string;
  client_id: string;
  redirect_url?: string;
}

export interface IdentityProviderRequest {
  type: IdentityProviderType;
  name: string;
  issuer: string;
  client_id: string;
  client_secret: string;
}
