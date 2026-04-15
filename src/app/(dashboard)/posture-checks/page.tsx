"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon, ShieldCheck } from "lucide-react";
import React, { lazy, Suspense } from "react";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import GroupsProvider from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import PoliciesProvider from "@/contexts/PoliciesProvider";
import { PostureCheck } from "@/interfaces/PostureCheck";
import PageContainer from "@/layouts/PageContainer";

const PostureCheckTable = lazy(
  () => import("@/modules/posture-checks/table/PostureCheckTable"),
);
export default function PostureChecksPage() {
  const { permission } = usePermissions();
  const { t } = useI18n();
  const { data: postureChecks, isLoading } =
    useFetchApi<PostureCheck[]>("/posture-checks");

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
            <Breadcrumbs.Item
              href={"/posture-checks"}
              label={t("nav.postureChecks")}
              active
              icon={<ShieldCheck size={15} />}
            />
          </Breadcrumbs>
          <h1 ref={headingRef}>{t("nav.postureChecks")}</h1>
          <Paragraph>{t("postureChecks.pageDescription")}</Paragraph>
          <Paragraph>
            {t("common.learnMorePrefix")}{" "}
            <InlineLink
              href={"https://docs.netbird.io/how-to/manage-posture-checks"}
              target={"_blank"}
            >
              {t("nav.postureChecks")}
              <ExternalLinkIcon size={12} />
            </InlineLink>
            {" "}{t("common.inDocumentationSuffix")}
          </Paragraph>
        </div>

        <RestrictedAccess
          page={t("nav.postureChecks")}
          hasAccess={permission.policies.read}
        >
          <PoliciesProvider>
            <Suspense fallback={<SkeletonTable />}>
              <PostureCheckTable
                headingTarget={portalTarget}
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
