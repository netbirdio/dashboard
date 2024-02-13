"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon, ShieldCheck } from "lucide-react";
import React, { lazy, Suspense } from "react";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import GroupsProvider from "@/contexts/GroupsProvider";
import PoliciesProvider from "@/contexts/PoliciesProvider";
import { Policy } from "@/interfaces/Policy";
import PageContainer from "@/layouts/PageContainer";

const PostureChecksTable = lazy(
  () =>
    import("@/modules/access-control/posture-checks/table/PostureChecksTable"),
);

export default function PostureChecksPage() {
  const { data: postureChecks, isLoading } =
    useFetchApi<Policy[]>("/posture-checks");

  return (
    <PageContainer>
      <GroupsProvider>
        <div className={"p-default py-6"}>
          <Breadcrumbs>
            <Breadcrumbs.Item
              href={"/access-control"}
              label={"Access Control"}
              icon={<AccessControlIcon size={13} />}
            />
            <Breadcrumbs.Item
              href={"/access-control/posture-checks"}
              label={"Posture Checks"}
              active
              icon={<ShieldCheck size={17} />}
            />
          </Breadcrumbs>
          <h1>
            {postureChecks && postureChecks.length > 1
              ? `${postureChecks.length} Posture Checks`
              : "Posture Checks"}
          </h1>
          <Paragraph>
            Create rules to manage access in your network and define what peers
            can connect.
          </Paragraph>
          <Paragraph>
            Learn more about
            <InlineLink href={"#"} target={"_blank"}>
              Posture Checks
              <ExternalLinkIcon size={12} />
            </InlineLink>
            in our documentation.
          </Paragraph>
        </div>

        <RestrictedAccess page={"Posture Checks"}>
          <PoliciesProvider>
            <Suspense fallback={<SkeletonTable />}>
              <PostureChecksTable
                isLoading={isLoading}
                postureChecks={postureChecks}
              />
            </Suspense>
          </PoliciesProvider>
        </RestrictedAccess>
      </GroupsProvider>
    </PageContainer>
  );
}
