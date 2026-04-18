"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon, LogsIcon } from "lucide-react";
import React from "react";
import ActivityIcon from "@/assets/icons/ActivityIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { ActivityEvent } from "@/interfaces/ActivityEvent";
import PageContainer from "@/layouts/PageContainer";
import ActivityTable from "@/modules/activity/ActivityTable";

export default function Activity() {
  const { permission } = usePermissions();
  const { t } = useI18n();

  const { data: events, isLoading } =
    useFetchApi<ActivityEvent[]>("/events/audit");

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            label={t("nav.activity")}
            disabled={true}
            icon={<ActivityIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/events/audit"}
            label={t("nav.auditEvents")}
            icon={<LogsIcon size={18} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>{t("activity.auditEventsTitle")}</h1>
        <Paragraph>{t("activity.auditEventsDescription")}</Paragraph>
        <Paragraph>
          {t("common.learnMorePrefix")}{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/audit-events-logging"}
            target={"_blank"}
          >
            {t("nav.auditEvents")}
            <ExternalLinkIcon size={12} />
          </InlineLink>
          {" "}{t("common.inDocumentationSuffix")}
        </Paragraph>
      </div>
      <RestrictedAccess page={t("nav.activity")} hasAccess={permission.events.read}>
        <ActivityTable
          events={events}
          isLoading={isLoading}
          headingTarget={portalTarget}
        />
      </RestrictedAccess>
    </PageContainer>
  );
}
