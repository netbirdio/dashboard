"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import { ExternalLinkIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import ReverseProxiesProvider from "@/contexts/ReverseProxiesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { REVERSE_PROXY_CUSTOM_DOMAINS_DOCS_LINK } from "@/interfaces/ReverseProxy";
import PageContainer from "@/layouts/PageContainer";

const CustomDomainsTable = lazy(
  () => import("@/modules/reverse-proxy/domain/CustomDomainsTable"),
);

export default function ReverseProxyCustomDomainsPage() {
  const { permission } = usePermissions();
  const { t } = useI18n();

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/reverse-proxy/services"}
            label={t("nav.reverseProxy")}
            icon={<ReverseProxyIcon size={16} />}
          />
          <Breadcrumbs.Item
            href={"/reverse-proxy/custom-domains"}
            label={t("nav.customDomains")}
            active={true}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>{t("customDomains.title")}</h1>
        <Paragraph>{t("customDomains.description")}</Paragraph>
        <Paragraph>
          {t("common.learnMorePrefix")}{" "}
          <InlineLink
            href={REVERSE_PROXY_CUSTOM_DOMAINS_DOCS_LINK}
            target={"_blank"}
          >
            {t("nav.customDomains")}
            <ExternalLinkIcon size={12} />
          </InlineLink>
          {" "}{t("common.inDocumentationSuffix")}
        </Paragraph>
      </div>
      <RestrictedAccess
        page={t("nav.customDomains")}
        hasAccess={permission?.services?.read}
      >
        <ReverseProxiesProvider>
          <Suspense fallback={<SkeletonTable />}>
            <CustomDomainsTable headingTarget={portalTarget} />
          </Suspense>
        </ReverseProxiesProvider>
      </RestrictedAccess>
    </PageContainer>
  );
}
