import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import * as Tabs from "@radix-ui/react-tabs";
import { ExternalLinkIcon, FileText } from "lucide-react";
import React from "react";
import IntegrationIcon from "@/assets/icons/IntegrationIcon";
import Datadog from "@/modules/integrations/event-streaming/datadog/Datadog";

export default function EventStreamingTab() {
  return (
    <Tabs.Content value={"event-streaming"}>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/integrations"}
            label={"Integrations"}
            icon={<IntegrationIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/integrations"}
            label={"Event Streaming"}
            icon={<FileText size={14} />}
            active
          />
        </Breadcrumbs>
        <h1>Event Streaming</h1>
        <Paragraph>
          Event Streaming allows you to stream NetBirds activity events to
          different third-party services.
        </Paragraph>
        <Paragraph>
          Learn more about{" "}
          <InlineLink href={"#"} target={"_blank"}>
            Event Streaming
            <ExternalLinkIcon size={12} />
          </InlineLink>
          in our documentation.
        </Paragraph>
        <div className={"gap-6 mt-6 flex flex-wrap"}>
          <Datadog />
        </div>
      </div>
    </Tabs.Content>
  );
}
