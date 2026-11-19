"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import { IconSettings2 } from "@tabler/icons-react";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon, User2 } from "lucide-react";
import React, { lazy, Suspense } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { User } from "@/interfaces/User";
import PageContainer from "@/layouts/PageContainer";
import UsersTabs from "@/modules/users/UsersTabs";

const ServiceUsersTable = lazy(
  () => import("@/modules/users/ServiceUsersTable"),
);

export default function ServiceUsers() {
  const t = useTranslations();
  const { permission } = usePermissions();
  const { data: users, isLoading } = useFetchApi<User[]>(
    "/users?service_user=true",
  );

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/team/users"}
            label={t("common.users")}
            icon={<User2 size={16} />}
          />
          <Breadcrumbs.Item
            href={"/team/service-users"}
            label={t("common.serviceUsers")}
            active
            icon={<IconSettings2 size={17} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>{t("common.serviceUsers")}</h1>
        <Paragraph>
          {t("team.serviceUsersDescription")}{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/access-netbird-public-api"}
            target={"_blank"}
          >
            {t("common.learnMore")}
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
      </div>
      <UsersTabs current={"service-users"} />
      <RestrictedAccess
        page={t("common.serviceUsers")}
        hasAccess={permission.users.read}
      >
        <Suspense fallback={<SkeletonTable />}>
          <ServiceUsersTable
            users={users}
            isLoading={isLoading}
            headingTarget={portalTarget}
          />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
