"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import dayjs from "dayjs";
import { ExternalLinkIcon } from "lucide-react";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import React, { useMemo } from "react";
import ActivityIcon from "@/assets/icons/ActivityIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import ServerPaginationProvider from "@/contexts/ServerPaginationProvider";
import PageContainer from "@/layouts/PageContainer";
import ReverseProxyEventsTable from "@/modules/reverse-proxy/events/ReverseProxyEventsTable";
import { usePortalElement } from "@hooks/usePortalElement";
import { REVERSE_PROXY_EVENTS_DOCS_LINK } from "@/interfaces/ReverseProxy";
import { useI18n } from "@/i18n/I18nProvider";

export default function ProxyEventsPage() {
  const { permission } = usePermissions();
  const { t } = useI18n();
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  const defaultFilters = useMemo(
    () => ({
      start_date: dayjs().subtract(7, "day").startOf("day").toISOString(),
      end_date: dayjs().endOf("day").toISOString(),
      sort_by: "timestamp",
      sort_order: "desc",
    }),
    [],
  );

  return (
    <PageContainer>
      <div className="p-default py-6">
        <Breadcrumbs>
          <Breadcrumbs.Item
            label={t("nav.activity")}
            disabled
            icon={<ActivityIcon size={13} />}
          />
          <Breadcrumbs.Item
            href="/events/proxy"
            label={t("nav.proxyEvents")}
            icon={<ReverseProxyIcon size={15} />}
          />
        </Breadcrumbs>

        <h1 ref={headingRef}>{t("proxyEvents.title")}</h1>

        <Paragraph>{t("proxyEvents.description")}</Paragraph>

        <Paragraph>
          {t("common.learnMorePrefix")}{" "}
          <InlineLink href={REVERSE_PROXY_EVENTS_DOCS_LINK} target="_blank">
            {t("nav.proxyEvents")} <ExternalLinkIcon size={12} />
          </InlineLink>{" "}
          {t("common.inDocumentationSuffix")}
        </Paragraph>
      </div>

      <RestrictedAccess
        page={t("nav.proxyEvents")}
        hasAccess={permission?.services?.read}
      >
        <ServerPaginationProvider
          url="/events/proxy"
          defaultPageSize={10}
          defaultFilters={defaultFilters}
        >
          <ReverseProxyEventsTable headingTarget={portalTarget} />
        </ServerPaginationProvider>
      </RestrictedAccess>
    </PageContainer>
  );
}
