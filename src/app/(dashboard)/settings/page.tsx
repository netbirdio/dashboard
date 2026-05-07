"use client";

import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { VerticalTabs } from "@components/VerticalTabs";
import {
  ActivityIcon,
  AlertOctagonIcon,
  FingerprintIcon,
  FolderGit2Icon,
  GlobeIcon,
  LockIcon,
  MonitorSmartphoneIcon,
  NetworkIcon,
  ShieldIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useI18n } from "@/i18n/I18nProvider";
import PageContainer from "@/layouts/PageContainer";
import { useAccount } from "@/modules/account/useAccount";
import AuthenticationTab from "@/modules/settings/AuthenticationTab";
import ClientSettingsTab from "@/modules/settings/ClientSettingsTab";
import DangerZoneTab from "@/modules/settings/DangerZoneTab";
import FlowLogsSettingsTab from "@/modules/settings/FlowLogsSettingsTab";
import IdentityProvidersTab from "@/modules/settings/IdentityProvidersTab";
import NetworkSettingsTab from "@/modules/settings/NetworkSettingsTab";
import PermissionsTab from "@/modules/settings/PermissionsTab";
import GroupsSettings from "@/modules/settings/GroupsSettings";
import VersionReleasesTab from "@/modules/settings/VersionReleasesTab";

export default function NetBirdSettings() {
  const queryParams = useSearchParams();
  const queryTab = queryParams.get("tab");
  const { permission } = usePermissions();
  const { t } = useI18n();

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
                {t("settings.authentication")}
              </VerticalTabs.Trigger>
              {account?.settings?.embedded_idp_enabled &&
                permission?.identity_providers?.read && (
                  <VerticalTabs.Trigger value="identity-providers">
                    <FingerprintIcon size={14} />
                    {t("settings.identityProviders")}
                  </VerticalTabs.Trigger>
                )}
              <VerticalTabs.Trigger value="groups">
                <FolderGit2Icon size={14} />
                {t("settings.groups")}
              </VerticalTabs.Trigger>
              <VerticalTabs.Trigger value="permissions">
                <LockIcon size={14} />
                {t("settings.permissions")}
              </VerticalTabs.Trigger>
              <VerticalTabs.Trigger value="networks">
                <NetworkIcon size={14} />
                {t("settings.networks")}
              </VerticalTabs.Trigger>
              <VerticalTabs.Trigger value="clients">
                <MonitorSmartphoneIcon size={14} />
                {t("settings.clients")}
              </VerticalTabs.Trigger>
              <VerticalTabs.Trigger value="flow-logs">
                <ActivityIcon size={14} />
                {t("settings.flowLogs")}
              </VerticalTabs.Trigger>
              <VerticalTabs.Trigger value="version-releases">
                <GlobeIcon size={14} />
                版本发布
              </VerticalTabs.Trigger>
            </>
          )}

          <DangerZoneTabTrigger />
        </VerticalTabs.List>
        <RestrictedAccess
          page={t("settings.title")}
          hasAccess={permission.settings.read}
        >
          <div className={"border-l border-nb-gray-930 w-full"}>
            {account && <AuthenticationTab account={account} />}
            {account?.settings?.embedded_idp_enabled &&
              permission.identity_providers.read && <IdentityProvidersTab />}
            {account && <PermissionsTab account={account} />}
            {account && <GroupsSettings account={account} />}
            {account && <NetworkSettingsTab account={account} />}
            {account && <ClientSettingsTab account={account} />}
            {account && <FlowLogsSettingsTab account={account} />}
            {account && <VersionReleasesTab />}
            {account && <DangerZoneTab account={account} />}
          </div>
        </RestrictedAccess>
      </VerticalTabs>
    </PageContainer>
  );
}

const DangerZoneTabTrigger = () => {
  const { isOwner } = useLoggedInUser();
  const { t } = useI18n();

  return (
    isOwner && (
      <VerticalTabs.Trigger value="danger-zone" disabled={!isOwner}>
        <AlertOctagonIcon size={14} />
        {t("settings.dangerZone")}
      </VerticalTabs.Trigger>
    )
  );
};
