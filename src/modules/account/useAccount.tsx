import useFetchApi from "@utils/api";
import { useMemo } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Account } from "@/interfaces/Account";

export const useAccount = () => {
  const { permission } = usePermissions();

  const { data: accounts } = useFetchApi<Account[]>(
    "/accounts",
    true,
    true,
    permission.accounts.read,
  );

  return useMemo(() => {
    if (!accounts) return;
    if (accounts.length === 0) return;
    return accounts[0];
  }, [accounts]);
};
