"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import { IconSettings2 } from "@tabler/icons-react";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import TeamIcon from "@/assets/icons/TeamIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { User } from "@/interfaces/User";
import PageContainer from "@/layouts/PageContainer";

const ServiceUsersTable = lazy(
  () => import("@/modules/users/ServiceUsersTable"),
);

export default function ServiceUsers() {
  const { permission } = usePermissions();
  const { t } = useI18n();
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
            href={"/team"}
            label={t("team.title")}
            icon={<TeamIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/team/service-users"}
            label={t("serviceUsers.title")}
            active
            icon={<IconSettings2 size={17} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>{t("serviceUsers.title")}</h1>
        <Paragraph>{t("serviceUsers.description")}</Paragraph>
        <Paragraph>
          {t("common.learnMorePrefix")}{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/access-netbird-public-api"}
            target={"_blank"}
          >
            {t("serviceUsers.title")}
            <ExternalLinkIcon size={12} />
          </InlineLink>
          {t("common.inDocumentationSuffix")}
        </Paragraph>
      </div>
      <RestrictedAccess
        page={t("serviceUsers.title")}
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
