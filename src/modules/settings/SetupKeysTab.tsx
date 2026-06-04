import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import * as Tabs from "@radix-ui/react-tabs";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon, KeyRound } from "lucide-react";
import React, { lazy, Suspense, useMemo } from "react";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import { SetupKey } from "@/interfaces/SetupKey";

const SetupKeysTable = lazy(
  () => import("@/modules/setup-keys/SetupKeysTable"),
);

export default function SetupKeysTab() {
  const { data: setupKeys, isLoading } = useFetchApi<SetupKey[]>("/setup-keys");
  const { permission } = usePermissions();
  const { groups } = useGroups();

  const setupKeysWithGroups = useMemo(() => {
    if (!setupKeys) return [];
    return setupKeys.map((setupKey) => {
      if (!setupKey.auto_groups) return setupKey;
      if (!groups) return setupKey;
      return {
        ...setupKey,
        groups: setupKey.auto_groups
          ?.map((group) => groups.find((g) => g.id === group) || undefined)
          .filter((group) => group !== undefined) as Group[],
      };
    });
  }, [setupKeys, groups]);

  return (
    <Tabs.Content value={"setup-keys"} className={"w-full"}>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=setup-keys"}
            label={"Setup Keys"}
            icon={<KeyRound size={14} />}
            active
          />
        </Breadcrumbs>
        <h1>Setup Keys</h1>
        <Paragraph>
          Setup keys are pre-authentication keys that allow to register new
          machines in your network.{" "}
          <InlineLink
            href={
              "https://docs.netbird.io/how-to/register-machines-using-setup-keys"
            }
            target={"_blank"}
          >
            Learn more
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
      </div>
      <RestrictedAccess
        page={"Setup Keys"}
        hasAccess={permission.setup_keys.read}
      >
        <Suspense fallback={<SkeletonTable />}>
          <SetupKeysTable
            setupKeys={setupKeysWithGroups}
            isLoading={isLoading}
          />
        </Suspense>
      </RestrictedAccess>
    </Tabs.Content>
  );
}