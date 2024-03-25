"use client";

import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { VerticalTabs } from "@components/VerticalTabs";
import {
  AlertOctagonIcon,
  FolderGit2Icon,
  LockIcon,
  ShieldIcon,
} from "lucide-react";
import React, { useState } from "react";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import PageContainer from "@/layouts/PageContainer";
import { useAccount } from "@/modules/account/useAccount";
import AuthenticationTab from "@/modules/settings/AuthenticationTab";
import DangerZoneTab from "@/modules/settings/DangerZoneTab";
import GroupsTab from "@/modules/settings/GroupsTab";
import PermissionsTab from "@/modules/settings/PermissionsTab";

export default function NetBirdSettings() {
  const [tab, setTab] = useState("authentication");
  const { isOwner } = useLoggedInUser();
  const account = useAccount();

  return (
    <PageContainer>
      <VerticalTabs value={tab} onChange={setTab}>
        <VerticalTabs.List>
          <VerticalTabs.Trigger value="authentication">
            <ShieldIcon size={14} />
            Authentication
          </VerticalTabs.Trigger>
          <VerticalTabs.Trigger value="groups">
            <FolderGit2Icon size={14} />
            Groups
          </VerticalTabs.Trigger>
          <VerticalTabs.Trigger value="permissions">
            <LockIcon size={14} />
            Permissions
          </VerticalTabs.Trigger>
          <VerticalTabs.Trigger value="danger-zone" disabled={!isOwner}>
            <AlertOctagonIcon size={14} />
            Danger zone
          </VerticalTabs.Trigger>
        </VerticalTabs.List>
        <RestrictedAccess page={"Settings"}>
          <div className={"border-l border-nb-gray-930 w-full"}>
            {account && <AuthenticationTab account={account} />}
            {account && <PermissionsTab account={account} />}
            {account && <GroupsTab account={account} />}
            {account && <DangerZoneTab account={account} />}
          </div>
        </RestrictedAccess>
      </VerticalTabs>
    </PageContainer>
  );
}
