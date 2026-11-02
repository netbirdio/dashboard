"use client";

import { notFound } from "next/navigation";
import * as React from "react";
import { useAgentNetworkMode } from "@/modules/agent-network/useAgentNetworkMode";

// Gates the entire Agent Network route tree behind the NETBIRD_AGENT_NETWORK
// flag or the account-level agent_network_only setting. When disabled, these
// routes don't exist as far as the user is concerned — the dashboard behaves
// exactly as it did without the feature. Rendering waits for the account to
// load so accounts enabled via settings don't get a redirect flash.
export default function AgentNetworkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { enabled, loading } = useAgentNetworkMode();

  if (enabled) {
    return <>{children}</>;
  }
  if (loading) {
    return null;
  }
  notFound();
}
