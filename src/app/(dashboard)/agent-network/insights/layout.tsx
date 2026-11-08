"use client";

import { isAgentNetworkInsightsPreview } from "@utils/netbird";
import { notFound } from "next/navigation";
import * as React from "react";

// Insights is a placeholder until the analytics exist: the routes are only
// there with NETBIRD_AGENT_NETWORK_INSIGHTS_PREVIEW set, and 404 otherwise.
// The parent layout already gates the whole Agent Network tree.
export default function AgentNetworkInsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAgentNetworkInsightsPreview()) notFound();
  return <>{children}</>;
}
