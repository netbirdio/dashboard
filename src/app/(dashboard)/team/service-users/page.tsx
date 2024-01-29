"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { IconSettings2 } from "@tabler/icons-react";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import TeamIcon from "@/assets/icons/TeamIcon";
import { User } from "@/interfaces/User";
import PageContainer from "@/layouts/PageContainer";

const ServiceUsersTable = lazy(
  () => import("@/modules/users/ServiceUsersTable"),
);

export default function ServiceUsers() {
  const { data: users, isLoading } = useFetchApi<User[]>(
    "/users?service_user=true",
  );

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
            href={"/team/service-users"}
            label={"Service Users"}
            active
            icon={<IconSettings2 size={17} />}
          />
        </Breadcrumbs>
        <h1>
          {users && users.length > 1
            ? `${users.length} Service Users`
            : "Service Users"}
        </h1>
        <Paragraph>
          Use service users to create API tokens and avoid losing automated
          access.
        </Paragraph>
        <Paragraph>
          Learn more about
          <InlineLink
            href={"https://docs.netbird.io/how-to/access-netbird-public-api"}
            target={"_blank"}
          >
            Service Users
            <ExternalLinkIcon size={12} />
          </InlineLink>
          in our documentation.
        </Paragraph>
      </div>
      <RestrictedAccess page={"Service Users"}>
        <Suspense fallback={<SkeletonTable />}>
          <ServiceUsersTable users={users} isLoading={isLoading} />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
