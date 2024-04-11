"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon } from "lucide-react";
import React, { lazy, Suspense, useMemo } from "react";
import SetupKeysIcon from "@/assets/icons/SetupKeysIcon";
import { useGroups } from "@/contexts/GroupsProvider";
import { Group } from "@/interfaces/Group";
import { SetupKey } from "@/interfaces/SetupKey";
import PageContainer from "@/layouts/PageContainer";

const SetupKeysTable = lazy(
  () => import("@/modules/setup-keys/SetupKeysTable"),
);

export default function SetupKeys() {
  const { data: setupKeys, isLoading } = useFetchApi<SetupKey[]>("/setup-keys");
  const { groups } = useGroups();

  const setupKeysWithGroups = useMemo(() => {
    if (!setupKeys) return [];
    return setupKeys?.map((setupKey) => {
      if (!setupKey.auto_groups) return setupKey;
      if (!groups) return setupKey;
      return {
        ...setupKey,
        groups: setupKey.auto_groups
          ?.map((group) => {
            return groups.find((g) => g.id === group) || undefined;
          })
          .filter((group) => group !== undefined) as Group[],
      };
    });
  }, [setupKeys, groups]);

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/setup-keys"}
            label={"Setup Keys"}
            icon={<SetupKeysIcon size={13} />}
          />
        </Breadcrumbs>
        <h1>
          {setupKeys && setupKeys.length > 1
            ? `${setupKeys.length} Setup Keys`
            : "Setup Keys"}
        </h1>
        <Paragraph>
          Setup keys are pre-authentication keys that allow to register new
          machines in your network.
        </Paragraph>
        <Paragraph>
          Learn more about
          <InlineLink
            href={
              "https://docs.netbird.io/how-to/register-machines-using-setup-keys"
            }
            target={"_blank"}
          >
            Setup Keys
            <ExternalLinkIcon size={12} />
          </InlineLink>
          in our documentation.
        </Paragraph>
      </div>
      <RestrictedAccess page={"Setup Keys"}>
        <Suspense fallback={<SkeletonTable />}>
          <SetupKeysTable
            setupKeys={setupKeysWithGroups}
            isLoading={isLoading}
          />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
