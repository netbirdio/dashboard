import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import * as Tabs from "@radix-ui/react-tabs";
import { ExternalLinkIcon } from "lucide-react";
import React from "react";
import Skeleton from "react-loading-skeleton";
import { useAccount } from "@/modules/account/useAccount";
import { LockedFeatureInfoCard } from "@/modules/billing/locked-feature/LockedFeatureInfoCard";
import { LockedFeatureOverlay } from "@/modules/billing/locked-feature/LockedFeatureOverlay";
import Firehose from "@/modules/integrations/event-streaming/amazon/firehose/Firehose";
import S3 from "@/modules/integrations/event-streaming/amazon/s3/S3";
import Datadog from "@/modules/integrations/event-streaming/datadog/Datadog";
import GenericHTTP from "@/modules/integrations/event-streaming/generic-http/GenericHTTP";
import { UserEmailMappingSetting } from "@/modules/integrations/event-streaming/UserEmailMappingSetting";

export default function EventStreamingTab() {
  const account = useAccount();

  return (
    <Tabs.Content value={"event-streaming"}>
      <div className={"p-default py-6"}>
        <h1>Event Streaming</h1>
        <Paragraph>
          Event Streaming allows you to stream NetBirds audit & traffic events
          to different third-party services.
        </Paragraph>
        <Paragraph>
          <InlineLink
            href={"https://docs.netbird.io/how-to/activity-event-streaming"}
            target={"_blank"}
          >
            Learn more
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>

        <LockedFeatureInfoCard
          featureText={"Event Streaming"}
          feature={"EVENT_STREAMING"}
        />
        <LockedFeatureOverlay feature={"EVENT_STREAMING"} opacity={100}>
          {account ? (
            <UserEmailMappingSetting account={account} />
          ) : (
            <Skeleton height={82} className={"mt-6"} />
          )}
          <div
            className={
              "gap-6 mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr"
            }
          >
            <Datadog />
            <S3 />
            <Firehose />
            <GenericHTTP />
          </div>
        </LockedFeatureOverlay>
      </div>
    </Tabs.Content>
  );
}
