"use client";

import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import { ExternalLinkIcon, FolderGit2Icon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import InlineLink from "@/components/InlineLink";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import PageContainer from "@/layouts/PageContainer";

const GroupsTable = lazy(() => import("@/modules/groups/table/GroupsTable"));

export default function GroupsPage() {
  const t = useTranslations();
  const { permission } = usePermissions();
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/groups"}
            label={t("common.groups")}
            icon={<FolderGit2Icon size={14} />}
            active
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>{t("common.groups")}</h1>
        <Paragraph>
          {t("groups.groupsDescription")}{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/manage-network-access"}
            target={"_blank"}
          >
            {t("common.learnMore")}
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
      </div>
      <RestrictedAccess hasAccess={permission.groups.read} page={t("common.groups")}>
        <Suspense fallback={<SkeletonTable />}>
          <GroupsTable headingTarget={portalTarget} />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
