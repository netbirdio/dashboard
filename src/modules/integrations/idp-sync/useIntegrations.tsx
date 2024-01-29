import useFetchApi from "@utils/api";
import {
  AzureADIntegration,
  GoogleWorkspaceIntegration,
} from "@/interfaces/IdentityProvider";

export const useIntegrations = () => {
  const { data: azureIntegrations, isLoading: isAzureLoading } = useFetchApi<
    AzureADIntegration[]
  >("/integrations/azure-idp");
  const { data: googleIntegrations, isLoading: isGoogleLoading } = useFetchApi<
    GoogleWorkspaceIntegration[]
  >("/integrations/google-idp");

  const azure = azureIntegrations?.[0];
  const google = googleIntegrations?.[0];

  const isAnyIntegrationEnabled = azure?.enabled || google?.enabled;

  return {
    azure,
    google,
    isAnyIntegrationEnabled,
    isAzureLoading,
    isGoogleLoading,
  };
};
