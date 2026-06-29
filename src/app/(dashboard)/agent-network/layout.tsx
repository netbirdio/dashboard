"use client";

import { isAgentNetworkEnabled } from "@utils/netbird";
import { notFound } from "next/navigation";
import * as React from "react";

// Gates the entire Agent Network route tree behind the NETBIRD_AGENT_NETWORK
// flag. When disabled, these routes don't exist as far as the user is
// concerned — the dashboard behaves exactly as it did without the feature.
export default function AgentNetworkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAgentNetworkEnabled()) {
    notFound();
  }
  return <>{children}</>;
}