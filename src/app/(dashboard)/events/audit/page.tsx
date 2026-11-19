"use client";

import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon } from "lucide-react";
import React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { ActivityEvent } from "@/interfaces/ActivityEvent";
import PageContainer from "@/layouts/PageContainer";
import ActivityTable from "@/modules/activity/ActivityTable";
import { EventStreamingCard } from "@/modules/integrations/event-streaming/EventStreamingCard";

export default function Activity() {
  const t = useTranslations();
  const { permission } = usePermissions();

  const { data: events, isLoading } =
    useFetchApi<ActivityEvent[]>("/events/audit");

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <h1 ref={headingRef}>{t("common.auditEvents")}</h1>
        <Paragraph>
          {t("events.auditEventsDescription")}{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/audit-events-logging"}
            target={"_blank"}
          >
            {t("common.learnMore")}
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
      </div>
      <RestrictedAccess page={t("events.title")} hasAccess={permission.events.read}>
        <EventStreamingCard />
        <ActivityTable
          events={events}
          isLoading={isLoading}
          headingTarget={portalTarget}
        />
      </RestrictedAccess>
    </PageContainer>
  );
}
