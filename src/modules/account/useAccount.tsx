import useFetchApi from "@utils/api";
import { useMemo } from "react";
import { Account } from "@/interfaces/Account";

export const useAccount = () => {
  const { data: accounts } = useFetchApi<Account[]>("/accounts", true, true);

  return useMemo(() => {
    if (!accounts) return;
    if (accounts.length === 0) return;
    return accounts[0];
  }, [accounts]);
};
