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
import { PostureCheck } from "@/interfaces/PostureCheck";
import PageContainer from "@/layouts/PageContainer";

const PostureCheckTable = lazy(
  () => import("@/modules/posture-checks/table/PostureCheckTable"),
);
export default function PostureChecksPage() {
  const { data: postureChecks, isLoading } =
    useFetchApi<PostureCheck[]>("/posture-checks");

  return (
    <PageContainer>
      <GroupsProvider>
        <div className={"p-default py-6"}>
          <Breadcrumbs>
            <Breadcrumbs.Item
              href={"/access-control"}
              label={"Access Control"}
              icon={<AccessControlIcon size={14} />}
            />
            <Breadcrumbs.Item
              href={"/posture-checks"}
              label={"Posture Checks"}
              active
              icon={<ShieldCheck size={15} />}
            />
          </Breadcrumbs>
          <h1>
            {postureChecks && postureChecks.length > 1
              ? `${postureChecks.length} Posture Checks`
              : "Posture Checks"}
          </h1>
          <Paragraph>
            Use posture checks to further restrict access in your network.
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
              <PostureCheckTable
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
