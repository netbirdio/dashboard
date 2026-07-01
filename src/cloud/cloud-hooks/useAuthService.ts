import { useApiCall } from "@utils/api";
import loadConfig from "@utils/config";
import { EnterpriseConnection } from "@/interfaces/IdentityProvider";

const config = loadConfig();
export const useAuthService = () => {
  const accountRequest = useApiCall<EnterpriseConnection[]>(
    "/service/account",
    true,
    {
      origin: config.authServiceUrl,
    },
  );

  const deleteAccount = async () => {
    return accountRequest.del({});
  };

  return {
    deleteAccount,
  } as const;
};
