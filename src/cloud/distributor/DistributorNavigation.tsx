import SidebarItem from "@components/SidebarItem";
import * as React from "react";
import { useEffect, useMemo } from "react";
import MSPIcon from "@/assets/icons/MSPIcon";
import TeamIcon from "@/assets/icons/TeamIcon";
import { useDistributor } from "@/cloud/distributor/contexts/DistributorProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { isNetBirdCloud } from "@utils/netbird";
import { Role } from "@/interfaces/User";
import PeerIcon from "@/assets/icons/PeerIcon";
import { USERS_ACTIVE_ROUTES } from "@/modules/navigation/sections";

export const DistributorNavigation = () => {
  const { isActive } = useDistributor();
  const { isOwnerOrAdmin, loggedInUser } = useLoggedInUser();
  const { permission, isRestricted } = usePermissions();
  const isBillingAdmin = loggedInUser?.role === Role.BillingAdmin;

  const show = useMemo(() => {
    return isActive && isNetBirdCloud();
  }, [isActive, isOwnerOrAdmin]);

  /**
   * Hide the entire navigation for billing admins because they only have
   * access to plans & billing settings and no other pages.
   */
  useEffect(() => {
    if (!show || !isBillingAdmin) return;

    const style = document.createElement("style");
    style.setAttribute("data-distributor-billing-admin", "");
    style.textContent = `body[data-distributor] [data-navigation], body[data-distributor] [data-navbar-colappse-toggle] { display: none; }`;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, [show, isBillingAdmin]);

  if (!show) return;

  return (
    <div data-distributor-nav="">
      {/* Show peers only for regular users — distributors don't have peer access,
          but user role has no other pages to navigate to */}
      <SidebarItem
        icon={<PeerIcon />}
        label="Peers"
        href={"/peers"}
        visible={!isRestricted && loggedInUser?.role === Role.User}
      />

      <SidebarItem
        icon={<MSPIcon size={17} />}
        visible={isOwnerOrAdmin}
        label={"Customers"}
        href={"/customers"}
        exactPathMatch={true}
        labelClassName={"-left-[1.5px] relative"}
      />

      {/* Users with its Service Users tab, as in the regular sidebar. The
          account area (Settings, Integrations, Audit Events) follows below. */}
      <SidebarItem
        icon={<TeamIcon />}
        visible={permission.users.read}
        label={"Users"}
        href={"/team/users"}
        activeRoutes={USERS_ACTIVE_ROUTES}
      />
    </div>
  );
};
