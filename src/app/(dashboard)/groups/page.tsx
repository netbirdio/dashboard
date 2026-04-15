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
import { useI18n } from "@/i18n/I18nProvider";
import PageContainer from "@/layouts/PageContainer";

const GroupsTable = lazy(() => import("@/modules/groups/table/GroupsTable"));

export default function GroupsPage() {
  const { permission } = usePermissions();
  const { t } = useI18n();
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/groups"}
            label={t("groups.title")}
            icon={<FolderGit2Icon size={14} />}
            active
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>{t("groups.title")}</h1>
        <Paragraph>{t("groups.description")}</Paragraph>
        <Paragraph>
          {t("common.learnMorePrefix")}{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/manage-network-access"}
            target={"_blank"}
          >
            {t("groups.title")}
            <ExternalLinkIcon size={12} />
          </InlineLink>
          {t("common.inDocumentationSuffix")}
        </Paragraph>
      </div>
      <RestrictedAccess
        hasAccess={permission.groups.read}
        page={t("groups.title")}
      >
        <Suspense fallback={<SkeletonTable />}>
          <GroupsTable headingTarget={portalTarget} />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
