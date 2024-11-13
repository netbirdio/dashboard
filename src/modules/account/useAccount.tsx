import useFetchApi from "@utils/api";
import { useMemo } from "react";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { Account } from "@/interfaces/Account";

export const useAccount = () => {
  const { isBillingAdmin } = useLoggedInUser();
  const { data: accounts } = useFetchApi<Account[]>(
    "/accounts",
    true,
    true,
    !isBillingAdmin,
  );

  return useMemo(() => {
    if (!accounts) return;
    if (accounts.length === 0) return;
    return accounts[0];
  }, [accounts]);
};
