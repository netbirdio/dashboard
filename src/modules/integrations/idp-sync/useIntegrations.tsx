import useFetchApi from "@utils/api";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  AzureADIntegration,
  GoogleWorkspaceIntegration,
  IdentityProvider,
  OktaIntegration,
  ScimIntegration,
} from "@/interfaces/IdentityProvider";

export const useIntegrations = () => {
  const { permission } = usePermissions();
  const allowFetch = permission?.idp?.read ?? false;

  const { data: azureIntegrations, isLoading: isAzureLoading } = useFetchApi<
    AzureADIntegration[]
  >("/integrations/azure-idp", false, true, allowFetch);
  const { data: googleIntegrations, isLoading: isGoogleLoading } = useFetchApi<
    GoogleWorkspaceIntegration[]
  >("/integrations/google-idp", false, true, allowFetch);
  const { data: oktaIntegration, isLoading: isOktaLoading } = useFetchApi<
    OktaIntegration[]
  >("/integrations/okta-scim-idp", false, true, allowFetch);
  const { data: scimIntegrations, isLoading: isScimLoading } = useFetchApi<
    ScimIntegration[]
  >("/integrations/scim-idp", false, true, allowFetch);

  const azure = azureIntegrations?.[0];
  const google = googleIntegrations?.[0];
  const okta = oktaIntegration?.[0];
  const jumpcloud = scimIntegrations?.find(
    (i) => i.provider === IdentityProvider.JUMPCLOUD,
  );
  const generic = scimIntegrations?.find(
    (i) => i.provider === IdentityProvider.GENERIC,
  );
  const entra = scimIntegrations?.find(
    (i) => i.provider === IdentityProvider.ENTRA,
  );

  const isEnabled = {
    azure: azure?.enabled,
    google: google?.enabled,
    okta: okta?.enabled,
    jumpcloudScim: jumpcloud?.enabled,
    genericScim: generic?.enabled,
    entraScim: entra?.enabled,
  };

  const isAnyIntegrationEnabled = Object.values(isEnabled).some(Boolean);

  const getScimIntegrationByProvider = (provider?: IdentityProvider) => {
    if (!provider) return generic;
    return scimIntegrations?.find((i) => i.provider === provider);
  };

  return {
    azure,
    google,
    okta,
    jumpcloud,
    generic,
    isAnyIntegrationEnabled,
    isAzureLoading,
    isGoogleLoading,
    isOktaLoading,
    isScimLoading,
    isAzureEnabled: isEnabled["azure"],
    isGoogleEnabled: isEnabled["google"],
    isOktaEnabled: isEnabled["okta"],
    isJumpcloudEnabled: isEnabled["jumpcloudScim"],
    isGenericEnabled: isEnabled["genericScim"],
    isEntraEnabled: isEnabled["entraScim"],
    getScimIntegrationByProvider,
  };
};
