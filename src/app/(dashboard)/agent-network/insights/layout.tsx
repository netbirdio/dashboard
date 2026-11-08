"use client";

import { isAgentNetworkInsightsEnabled } from "@utils/netbird";
import { notFound } from "next/navigation";
import * as React from "react";

// The Insights pages are placeholders. They exist only where the deployment
// switches them on (NETBIRD_AGENT_NETWORK_INSIGHTS); everywhere else these
// routes are not there, the same as Agent Network itself when it is off.
export default function AgentNetworkInsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAgentNetworkInsightsEnabled()) notFound();
  return <>{children}</>;
}
