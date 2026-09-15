import useFetchApi from "@utils/api";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { SSOIdentityProvider } from "@/interfaces/IdentityProvider";
import { useAccount } from "@/modules/account/useAccount";

export function useEmbeddedIdentityProviders() {
  const account = useAccount();
  const { permission } = usePermissions();
  const isEmbeddedIdPEnabled = !!account?.settings?.embedded_idp_enabled;

  // The listing needs the identity_providers grant; without it the call is
  // a guaranteed 403, so gate on the grant as well as the account setting.
  const { data: providers } = useFetchApi<SSOIdentityProvider[]>(
    "/identity-providers",
    true,
    true,
    isEmbeddedIdPEnabled && permission.identity_providers.read,
  );

  return { providers, isEmbeddedIdPEnabled };
}
