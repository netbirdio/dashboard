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
import PoliciesProvider from "@/contexts/PoliciesProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { PostureCheck } from "@/interfaces/PostureCheck";
import PageContainer from "@/layouts/PageContainer";

const PostureCheckTable = lazy(
  () => import("@/modules/posture-checks/table/PostureCheckTable"),
);
export default function PostureChecksPage() {
  const t = useTranslations();
  const { permission } = usePermissions();
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
              label={t("common.accessControl")}
              icon={<AccessControlIcon size={14} />}
            />
            <Breadcrumbs.Item
              href={"/posture-checks"}
              label={t("common.postureChecks")}
              active
              icon={<ShieldCheck size={15} />}
            />
          </Breadcrumbs>
          <h1 ref={headingRef}>{t("common.postureChecks")}</h1>
          <Paragraph>
            {t("postureChecks.usePostureChecks")}{" "}
            <InlineLink
              href={"https://docs.netbird.io/how-to/manage-posture-checks"}
              target={"_blank"}
            >
              {t("common.learnMore")}
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>

        <RestrictedAccess
          page={t("common.postureChecks")}
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
