import { useAccount } from "@/modules/account/useAccount";
import { SSOIdentityProvider } from "@/interfaces/IdentityProvider";
import useFetchApi from "@utils/api";

export function useEmbeddedIdentityProviders() {
  const account = useAccount();
  const isEmbeddedIdPEnabled = !!account?.settings?.embedded_idp_enabled;

  const { data: providers } = useFetchApi<SSOIdentityProvider[]>(
    "/identity-providers",
    true,
    true,
    isEmbeddedIdPEnabled,
  );

  return { providers, isEmbeddedIdPEnabled };
}
