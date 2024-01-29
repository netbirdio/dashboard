"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import useFetchApi from "@utils/api";
import { isLocalDev, isNetBirdHosted } from "@utils/netbird";
import { ExternalLinkIcon } from "lucide-react";
import React from "react";
import ActivityIcon from "@/assets/icons/ActivityIcon";
import { ActivityEvent } from "@/interfaces/ActivityEvent";
import PageContainer from "@/layouts/PageContainer";
import ActivityTable from "@/modules/activity/ActivityTable";
import { EventStreamingCard } from "@/modules/integrations/event-streaming/EventStreamingCard";

export default function Activity() {
  const { data: events, isLoading } = useFetchApi<ActivityEvent[]>("/events");

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
        <h1>
          {events && events.length > 1
            ? `${events.length} Activity Events`
            : "Activity Events"}
        </h1>
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
        {(isLocalDev() || isNetBirdHosted()) && <EventStreamingCard />}
        <ActivityTable events={events} isLoading={isLoading} />
      </RestrictedAccess>
    </PageContainer>
  );
}
