import SidebarItem from "@components/SidebarItem";
import { isNetBirdCloud } from "@utils/netbird";
import * as React from "react";
import { useMemo } from "react";
import MSPIcon from "@/assets/icons/MSPIcon";
import { useMSP } from "@/cloud/msp/contexts/MSPProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";

export const MSPNavigationItem = () => {
  const { isActive, isMSPInMSPContext } = useMSP();
  const { isOwnerOrAdmin } = useLoggedInUser();
  const { permission } = usePermissions();

  const showNavigationItem = useMemo(() => {
    if (!isActive) return false;
    return isMSPInMSPContext && isOwnerOrAdmin;
  }, [isActive, isMSPInMSPContext, isOwnerOrAdmin]);

  if (!showNavigationItem) return;

  return (
    isNetBirdCloud() && (
      <SidebarItem
        icon={<MSPIcon size={17} />}
        visible={permission?.tenants?.read}
        label={<div className={"flex items-center gap-2"}>Tenants</div>}
        href={"/tenants"}
        exactPathMatch={true}
        labelClassName={"-left-[1.5px] relative"}
      />
    )
  );
};
