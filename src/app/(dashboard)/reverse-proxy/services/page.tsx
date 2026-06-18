"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import { Callout } from "@components/Callout";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import { isNetBirdHosted } from "@utils/netbird";
import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from 'next-intl';
import React, { lazy, Suspense } from "react";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import ReverseProxiesProvider from "@/contexts/ReverseProxiesProvider";
import { REVERSE_PROXY_DOCS_LINK } from "@/interfaces/ReverseProxy";
import PageContainer from "@/layouts/PageContainer";

const ReverseProxyTable = lazy(
  () => import("@/modules/reverse-proxy/table/ReverseProxyTable"),
);

export default function ReverseProxyServicesPage() {
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
            href={"/reverse-proxy/services"}
            label={t('services')}
            active={true}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>{t('services')}</h1>
        <Paragraph>
          {t('servicesDescription')}{" "}
          <InlineLink href={REVERSE_PROXY_DOCS_LINK} target={"_blank"}>
            {tCommon('learnMore')}
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>

        {isNetBirdHosted() ? (
          <Callout className={"max-w-xl mt-5"} variant={"info"}>
            {t('betaNoticeCloud')}
          </Callout>
        ) : (
          <Callout className={"max-w-xl mt-5"} variant={"info"}>
            {t('betaNoticeSelfHosted')}
          </Callout>
        )}

        <RestrictedAccess page={t('services')} hasAccess={permission.services?.read}>
          <Suspense fallback={<SkeletonTable />}>
            <ReverseProxiesProvider>
              <ReverseProxyTable headingTarget={portalTarget} />
            </ReverseProxiesProvider>
          </Suspense>
        </RestrictedAccess>
      </div>
    </PageContainer>
  );
}
