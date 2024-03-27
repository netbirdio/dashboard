import useFetchApi from "@utils/api";
import {
  AzureADIntegration,
  GoogleWorkspaceIntegration,
  OktaIntegration,
} from "@/interfaces/IdentityProvider";

export const useIntegrations = () => {
  const { data: azureIntegrations, isLoading: isAzureLoading } = useFetchApi<
    AzureADIntegration[]
  >("/integrations/azure-idp");
  const { data: googleIntegrations, isLoading: isGoogleLoading } = useFetchApi<
    GoogleWorkspaceIntegration[]
  >("/integrations/google-idp");
  const { data: oktaIntegration, isLoading: isOktaLoading } = useFetchApi<
    OktaIntegration[]
  >("/integrations/okta-scim-idp");

  const azure = azureIntegrations?.[0];
  const google = googleIntegrations?.[0];
  const okta = oktaIntegration?.[0];

  const isAnyIntegrationEnabled =
    azure?.enabled || google?.enabled || okta?.enabled;

  return {
    azure,
    google,
    okta,
    isAnyIntegrationEnabled,
    isAzureLoading,
    isGoogleLoading,
    isOktaLoading,
  };
};
