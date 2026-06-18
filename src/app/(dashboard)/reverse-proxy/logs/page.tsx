"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from 'next-intl';
import { lazy, Suspense } from "react";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { REVERSE_PROXY_EVENTS_DOCS_LINK } from "@/interfaces/ReverseProxy";
import PageContainer from "@/layouts/PageContainer";

const ReverseProxyEventsTable = lazy(
  () => import("@/modules/reverse-proxy/events/ReverseProxyEventsTable"),
);

export default function ProxyLogsPage() {
  const t = useTranslations('reverseProxy');
  const tCommon = useTranslations('common');
  const { permission } = usePermissions();

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/reverse-proxy/services"}
            label={t('title')}
            icon={<ReverseProxyIcon size={16} />}
          />
          <Breadcrumbs.Item
            href={"/reverse-proxy/logs"}
            label={t('accessLogs')}
            active={true}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>{t('accessLogs')}</h1>
        <Paragraph>
          {t('accessLogsDescription')}{" "}
          <InlineLink href={REVERSE_PROXY_EVENTS_DOCS_LINK} target={"_blank"}>
            {tCommon('learnMore')}
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
        <RestrictedAccess page={t('accessLogs')} hasAccess={permission.services?.read}>
          <Suspense fallback={<SkeletonTable />}>
            <ReverseProxyEventsTable headingTarget={portalTarget} />
          </Suspense>
        </RestrictedAccess>
      </div>
    </PageContainer>
  );
}
