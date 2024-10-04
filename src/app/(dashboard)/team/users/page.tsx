"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon, User2 } from "lucide-react";
import React, { lazy, Suspense } from "react";
import TeamIcon from "@/assets/icons/TeamIcon";
import { User } from "@/interfaces/User";
import PageContainer from "@/layouts/PageContainer";

const UsersTable = lazy(() => import("@/modules/users/UsersTable"));

export default function TeamUsers() {
  const { data: users, isLoading } = useFetchApi<User[]>(
    "/users?service_user=false",
  );

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/team"}
            label={"Team"}
            icon={<TeamIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/team/users"}
            label={"Users"}
            active
            icon={<User2 size={16} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Users</h1>
        <Paragraph>
          Manage users and their permissions. Same-domain email users are added
          automatically on first sign-in.
        </Paragraph>
        <Paragraph>
          Learn more about
          <InlineLink
            href={"https://docs.netbird.io/how-to/add-users-to-your-network"}
            target={"_blank"}
          >
            Users
            <ExternalLinkIcon size={12} />
          </InlineLink>
          in our documentation.
        </Paragraph>
      </div>
      <RestrictedAccess page={"Users"}>
        <Suspense fallback={<SkeletonTable />}>
          <UsersTable
            users={users}
            isLoading={isLoading}
            headingTarget={portalTarget}
          />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
