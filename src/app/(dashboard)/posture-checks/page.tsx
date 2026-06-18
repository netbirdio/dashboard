"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import { ExternalLinkIcon, ShieldCheck } from "lucide-react";
import { useTranslations } from 'next-intl';
import { lazy, Suspense } from "react";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { PostureCheck } from "@/interfaces/PostureCheck";
import PageContainer from "@/layouts/PageContainer";
import useFetchApi from "@utils/api";

const PostureCheckTable = lazy(
  () => import("@/modules/posture-checks/table/PostureCheckTable"),
);

export default function PostureChecksPage() {
  const t = useTranslations('postureChecks');
  const tCommon = useTranslations('common');
  const { permission } = usePermissions();
  const { data: postureChecks, isLoading } = useFetchApi<PostureCheck[]>("/posture-checks");

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/posture-checks"}
            label={t('title')}
            icon={<ShieldCheck size={14} />}
            active
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>{t('title')}</h1>
        <Paragraph>
          {t('pageDescription')}{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/manage-posture-checks"}
            target={"_blank"}
          >
            {tCommon('learnMore')}
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
      </div>
      <RestrictedAccess page={t('title')} hasAccess={permission.policies.read}>
        <Suspense fallback={<SkeletonTable />}>
          <PostureCheckTable postureChecks={postureChecks} isLoading={isLoading} headingTarget={portalTarget} />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
