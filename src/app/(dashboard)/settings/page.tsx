"use client";

import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { VerticalTabs } from "@components/VerticalTabs";
import {
  AlertOctagonIcon,
  LockIcon,
  MonitorSmartphoneIcon,
  NetworkIcon,
  ShieldIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import PageContainer from "@/layouts/PageContainer";
import { useAccount } from "@/modules/account/useAccount";
import AuthenticationTab from "@/modules/settings/AuthenticationTab";
import ClientSettingsTab from "@/modules/settings/ClientSettingsTab";
import DangerZoneTab from "@/modules/settings/DangerZoneTab";
import NetworkSettingsTab from "@/modules/settings/NetworkSettingsTab";
import PermissionsTab from "@/modules/settings/PermissionsTab";

export default function NetBirdSettings() {
  const queryParams = useSearchParams();
  const queryTab = queryParams.get("tab");
  const { permission } = usePermissions();

  const initialTab = useMemo(() => {
    if (permission.settings.read) return "authentication";
    return "authentication";
  }, [permission]);

  const [tab, setTab] = useState(queryTab ?? initialTab);

  const account = useAccount();

  useEffect(() => {
    if (queryTab) {
      setTab(queryTab);
    }
  }, [queryTab]);

  return (
    <PageContainer>
      <VerticalTabs value={tab} onChange={setTab}>
        <VerticalTabs.List>
          {permission.settings.read && (
            <>
              <VerticalTabs.Trigger value="authentication">
                <ShieldIcon size={14} />
                Authentication
              </VerticalTabs.Trigger>
              <VerticalTabs.Trigger value="permissions">
                <LockIcon size={14} />
                Permissions
              </VerticalTabs.Trigger>
              <VerticalTabs.Trigger value="networks">
                <NetworkIcon size={14} />
                Networks
              </VerticalTabs.Trigger>
              <VerticalTabs.Trigger value="clients">
                <MonitorSmartphoneIcon size={14} />
                Clients
              </VerticalTabs.Trigger>
            </>
          )}

          <DangerZoneTabTrigger />
        </VerticalTabs.List>
        <RestrictedAccess
          page={"Settings"}
          hasAccess={permission.settings.read}
        >
          <div className={"border-l border-nb-gray-930 w-full"}>
            {account && <AuthenticationTab account={account} />}
            {account && <PermissionsTab account={account} />}
            {account && <NetworkSettingsTab account={account} />}
            {account && <ClientSettingsTab account={account} />}
            {account && <DangerZoneTab account={account} />}
          </div>
        </RestrictedAccess>
      </VerticalTabs>
    </PageContainer>
  );
}

const DangerZoneTabTrigger = () => {
  const { isOwner } = useLoggedInUser();

  return (
    isOwner && (
      <VerticalTabs.Trigger value="danger-zone" disabled={!isOwner}>
        <AlertOctagonIcon size={14} />
        Danger zone
      </VerticalTabs.Trigger>
    )
  );
};
