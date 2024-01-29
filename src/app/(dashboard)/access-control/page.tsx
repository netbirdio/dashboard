"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import GroupsProvider from "@/contexts/GroupsProvider";
import PoliciesProvider from "@/contexts/PoliciesProvider";
import { Policy } from "@/interfaces/Policy";
import PageContainer from "@/layouts/PageContainer";

const AccessControlTable = lazy(
  () => import("@/modules/access-control/table/AccessControlTable"),
);
export default function AccessControlPage() {
  const { data: policies, isLoading } = useFetchApi<Policy[]>("/policies");

  return (
    <PageContainer>
      <GroupsProvider>
        <div className={"p-default py-6"}>
          <Breadcrumbs>
            <Breadcrumbs.Item
              href={"/policies"}
              label={"Access Control"}
              icon={<AccessControlIcon size={13} />}
            />
          </Breadcrumbs>
          <h1>
            {policies && policies.length > 1
              ? `${policies.length} Access Control Rules`
              : "Access Control Rules"}
          </h1>
          <Paragraph>
            Create rules to manage access in your network and define what peers
            can connect.
          </Paragraph>
          <Paragraph>
            Learn more about
            <InlineLink
              href={"https://docs.netbird.io/how-to/manage-network-access"}
              target={"_blank"}
            >
              Access Controls
              <ExternalLinkIcon size={12} />
            </InlineLink>
            in our documentation.
          </Paragraph>
        </div>

        <RestrictedAccess page={"Access Control"}>
          <PoliciesProvider>
            <Suspense fallback={<SkeletonTable />}>
              <AccessControlTable isLoading={isLoading} policies={policies} />
            </Suspense>
          </PoliciesProvider>
        </RestrictedAccess>
      </GroupsProvider>
    </PageContainer>
  );
}
