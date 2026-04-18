"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import GroupsProvider from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import PoliciesProvider from "@/contexts/PoliciesProvider";
import { Policy } from "@/interfaces/Policy";
import PageContainer from "@/layouts/PageContainer";

const AccessControlTable = lazy(
  () => import("@/modules/access-control/table/AccessControlTable"),
);
export default function AccessControlPage() {
  const { permission } = usePermissions();
  const { t } = useI18n();

  const { data: policies, isLoading } = useFetchApi<Policy[]>("/policies");

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <GroupsProvider>
        <div className={"p-default py-6"}>
          <Breadcrumbs>
            <Breadcrumbs.Item
              href={"/access-control"}
              label={t("accessControl.title")}
              icon={<AccessControlIcon size={14} />}
            />
          </Breadcrumbs>
          <h1 ref={headingRef}>{t("accessControl.policiesTitle")}</h1>
          <Paragraph>{t("accessControl.description")}</Paragraph>
          <Paragraph>
            {t("common.learnMorePrefix")}{" "}
            <InlineLink
              href={"https://docs.netbird.io/how-to/manage-network-access"}
              target={"_blank"}
            >
              {t("accessControl.learnMoreLink")}
              <ExternalLinkIcon size={12} />
            </InlineLink>
            {t("common.inDocumentationSuffix")}
          </Paragraph>
        </div>

        <RestrictedAccess
          page={t("accessControl.title")}
          hasAccess={permission.policies.read}
        >
          <PoliciesProvider>
            <Suspense fallback={<SkeletonTable />}>
              <AccessControlTable
                isLoading={isLoading}
                policies={policies}
                headingTarget={portalTarget}
              />
            </Suspense>
          </PoliciesProvider>
        </RestrictedAccess>
      </GroupsProvider>
    </PageContainer>
  );
}
