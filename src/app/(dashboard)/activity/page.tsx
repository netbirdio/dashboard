"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon } from "lucide-react";
import React from "react";
import ActivityIcon from "@/assets/icons/ActivityIcon";
import { ActivityEvent } from "@/interfaces/ActivityEvent";
import PageContainer from "@/layouts/PageContainer";
import ActivityTable from "@/modules/activity/ActivityTable";

export default function Activity() {
  const { data: events, isLoading } = useFetchApi<ActivityEvent[]>("/events");

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/activity"}
            label={"Activity"}
            icon={<ActivityIcon size={13} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Activity Events</h1>
        <Paragraph>
          Here you can see all the account and network activity events.
        </Paragraph>
        <Paragraph>
          Learn more about{" "}
          <InlineLink
            href={
              "https://docs.netbird.io/how-to/monitor-system-and-network-activity"
            }
            target={"_blank"}
          >
            Activity Events
            <ExternalLinkIcon size={12} />
          </InlineLink>
          in our documentation.
        </Paragraph>
      </div>
      <RestrictedAccess page={"Activity"}>
        <ActivityTable
          events={events}
          isLoading={isLoading}
          headingTarget={portalTarget}
        />
      </RestrictedAccess>
    </PageContainer>
  );
}
