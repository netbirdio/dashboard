import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDistributor } from "@/cloud/distributor/contexts/DistributorProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { Role } from "@/interfaces/User";

const useDistributorRedirect = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { isOwnerOrAdmin, loggedInUser } = useLoggedInUser();

  const { isActive: isDistributor, isDistributorInfoLoading } =
    useDistributor();

  const isRegularUser = loggedInUser?.role === Role.User;
  const isBillingAdmin = loggedInUser?.role === Role.BillingAdmin;

  // The Peers area now spans /peers, /peers/users and /peers/servers; we
  // gate the redirect on any of them so a distributor that lands on a
  // sub-page still gets bounced to their proper home.
  const onPeersArea =
    pathname === "/peers" ||
    pathname === "/peers/users" ||
    pathname === "/peers/servers";

  React.useEffect(() => {
    if (!isDistributor || !onPeersArea) return;

    if (isOwnerOrAdmin) {
      router.replace("/customers");
    } else if (isBillingAdmin) {
      router.replace("/settings?tab=plans-and-billing");
    } else if (!isRegularUser) {
      router.replace("/team/users");
    }
  }, [isDistributor, onPeersArea, router, isOwnerOrAdmin, isRegularUser, isBillingAdmin]);

  // Regular users stay on the Peers area, everyone else redirects
  const isRedirecting = isDistributor && onPeersArea && !isRegularUser;

  return {
    isLoading: isDistributorInfoLoading || isRedirecting,
  };
};
export default useDistributorRedirect;
