"use client"
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { usePortalElement } from "@hooks/usePortalElement";
import React, { lazy, Suspense } from "react";
import PageContainer from "@/layouts/PageContainer";
import Breadcrumbs from "@/components/Breadcrumbs";
import TeamIcon from "@/assets/icons/TeamIcon";
import { ExternalLinkIcon, FolderGit2Icon } from "lucide-react";
import InlineLink from "@/components/InlineLink";
const GroupsTable = lazy(() => import("@/modules/groups/GroupsTable"));


export default function GroupsPage() {
//@Edward : do we need here Restriction ??
  return (<PageContainer>
    <GroupsView />
  </PageContainer>)

}

export function GroupsView() {
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/team"}
            label={"Team"}
            icon={<TeamIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/team/groups"}
            label={"Groups"}
            icon={<FolderGit2Icon size={14} />}
            active
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Groups</h1>
        <Paragraph>
          Here is the overview of the groups of your account. You can
          delete the unused ones.
        </Paragraph>
        <Paragraph>
          Learn more about{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/manage-network-access"}
            target={"_blank"}
          >
            Groups
            <ExternalLinkIcon size={12} />
          </InlineLink>
          in our documentation.
        </Paragraph>
      </div>
      <Suspense fallback={<SkeletonTable />}>
        <GroupsTable headingTarget={portalTarget} />
      </Suspense>
    </>
  );
}
