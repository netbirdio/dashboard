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
import { ActivityEvent } from "@/interfaces/ActivityEvent";
import PageContainer from "@/layouts/PageContainer";
import ActivityTable from "@/modules/activity/ActivityTable";

export default function Activity() {
  const { permission } = usePermissions();

  const { data: events, isLoading } =
    useFetchApi<ActivityEvent[]>("/events/audit");

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            label={"Activity"}
            disabled={true}
            icon={<ActivityIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/events/audit"}
            label={"Audit Events"}
            icon={<LogsIcon size={18} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Audit Events</h1>
        <Paragraph>Here you can see all the audit activity events.</Paragraph>
        <Paragraph>
          Learn more about{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/audit-events-logging"}
            target={"_blank"}
          >
            Audit Events
            <ExternalLinkIcon size={12} />
          </InlineLink>
          in our documentation.
        </Paragraph>
      </div>
      <RestrictedAccess page={"Activity"} hasAccess={permission.events.read}>
        <ActivityTable
          events={events}
          isLoading={isLoading}
          headingTarget={portalTarget}
        />
      </RestrictedAccess>
    </PageContainer>
  );
}
