"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import dayjs from "dayjs";
import { Globe2 } from "lucide-react";
import React, { useMemo } from "react";
import ActivityIcon from "@/assets/icons/ActivityIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import ServerPaginationProvider from "@/contexts/ServerPaginationProvider";
import { useI18n } from "@/i18n/I18nProvider";
import PageContainer from "@/layouts/PageContainer";
import DNSLogsTable from "@/modules/activity/DNSLogsTable";

export default function DNSEventsPage() {
  const { permission } = usePermissions();
  const { t } = useI18n();
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  const defaultFilters = useMemo(
    () => ({
      start_date: dayjs().subtract(5, "minute").toISOString(),
      end_date: dayjs().toISOString(),
      dns: "true",
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
            href="/events/dns"
            label={t("nav.dnsLogs")}
            icon={<Globe2 size={15} />}
          />
        </Breadcrumbs>

        <h1 ref={headingRef}>{t("dnsLogs.title")}</h1>
        <Paragraph>{t("dnsLogs.description")}</Paragraph>
      </div>

      <RestrictedAccess
        page={t("nav.dnsLogs")}
        hasAccess={permission?.events?.read}
      >
        <ServerPaginationProvider
          url="/events/network-traffic"
          defaultPageSize={500}
          defaultFilters={defaultFilters}
        >
          <DNSLogsTable headingTarget={portalTarget} />
        </ServerPaginationProvider>
      </RestrictedAccess>
    </PageContainer>
  );
}
