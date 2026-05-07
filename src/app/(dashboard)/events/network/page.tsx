"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import dayjs from "dayjs";
import React, { useMemo } from "react";
import ActivityIcon from "@/assets/icons/ActivityIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import ServerPaginationProvider from "@/contexts/ServerPaginationProvider";
import { useI18n } from "@/i18n/I18nProvider";
import PageContainer from "@/layouts/PageContainer";
import NetworkLogsTable from "@/modules/activity/NetworkLogsTable";
import { usePortalElement } from "@hooks/usePortalElement";

export default function NetworkEventsPage() {
  const { permission } = usePermissions();
  const { t } = useI18n();
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  const defaultFilters = useMemo(
    () => ({
      start_date: dayjs().subtract(5, "minute").toISOString(),
      end_date: dayjs().toISOString(),
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
            href="/events/network"
            label={t("nav.networkLogs")}
            icon={<ActivityIcon size={15} />}
          />
        </Breadcrumbs>

        <h1 ref={headingRef}>{t("networkLogs.title")}</h1>
        <Paragraph>{t("networkLogs.description")}</Paragraph>
      </div>

      <RestrictedAccess
        page={t("nav.networkLogs")}
        hasAccess={permission?.events?.read}
      >
        <ServerPaginationProvider
          url="/events/network-traffic"
          defaultPageSize={10000}
          defaultFilters={defaultFilters}
        >
          <NetworkLogsTable headingTarget={portalTarget} />
        </ServerPaginationProvider>
      </RestrictedAccess>
    </PageContainer>
  );
}
