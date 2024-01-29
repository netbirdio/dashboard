"use client";

import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { VerticalTabs } from "@components/VerticalTabs";
import { FileText, FingerprintIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useState } from "react";
import PageContainer from "@/layouts/PageContainer";
import EventStreamingTab from "@/modules/integrations/event-streaming/EventStreamingTab";
import IdentityProviderTab from "@/modules/integrations/idp-sync/IdentityProviderTab";

export default function Integrations() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const [tab, setTab] = useState(currentTab || "event-streaming");

  return (
    <PageContainer>
      <VerticalTabs value={tab} onChange={setTab}>
        <VerticalTabs.List>
          <VerticalTabs.Trigger value="event-streaming">
            <FileText size={14} />
            Event Streaming
          </VerticalTabs.Trigger>
          <VerticalTabs.Trigger value="identity-provider">
            <FingerprintIcon size={14} />
            Identity Provider
          </VerticalTabs.Trigger>
        </VerticalTabs.List>
        <RestrictedAccess page={"Integrations"}>
          <div className={"border-l border-nb-gray-930 w-full"}>
            <EventStreamingTab />
            <IdentityProviderTab />
          </div>
        </RestrictedAccess>
      </VerticalTabs>
    </PageContainer>
  );
}
