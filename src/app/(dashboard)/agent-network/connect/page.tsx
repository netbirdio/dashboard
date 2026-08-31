"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import React from "react";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import PageContainer from "@/layouts/PageContainer";
import { AgentConnectTabs } from "@/modules/agent-network/AgentConnectTabs";
import EndpointBadge from "@/modules/agent-network/EndpointBadge";
import ConnectProvidersTable from "@/modules/agent-network/table/ConnectProvidersTable";
import {
  APIMeSetup,
  useMyAgentNetworkSetup,
} from "@/modules/agent-network/useMyAgentNetworkSetup";

// ConnectAgentPage is the caller-scoped self-service view: the endpoint to
// configure tools with and the per-tool config that goes with it — the one
// place the agent config lives — plus the providers and models the caller's
// own policies allow. It needs no agent_network permission (the
// backing endpoint answers for the caller only), so every role, including
// plain users in the limited view, can use it whenever their setup is
// configured. The caller's own usage lives on the regular Usage & Logs page,
// which the server scopes to them.
export default function ConnectAgentPage() {
  const { setup, configured, isLoading } = useMyAgentNetworkSetup();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/agent-network/connect"}
            label={"Agent Network"}
            icon={<AgentNetworkIcon size={16} />}
          />
          <Breadcrumbs.Item
            href={"/agent-network/connect"}
            label={"Connect Agent"}
            active
          />
        </Breadcrumbs>
        <h1>Connect Your Agent</h1>
        <Paragraph>
          Point your agent at the NetBird endpoint as its base URL. No provider
          API key is required on the client. NetBird authenticates you through
          your identity provider and authorizes each request against your access
          policies.
        </Paragraph>

        {isLoading ? (
          <div className={"mt-4"}>
            <SkeletonTable />
          </div>
        ) : configured && setup ? (
          <ConnectAgentSetup setup={setup} />
        ) : (
          <div className={"mt-4 text-sm text-nb-gray-400 max-w-xl"}>
            Agent Network is not set up for your user yet. Ask your
            administrator to add you to an access policy.
          </div>
        )}
      </div>
    </PageContainer>
  );
}

function ConnectAgentSetup({ setup }: { setup: APIMeSetup }) {
  // EndpointBadge builds https:// URLs from a bare host.
  const bareEndpoint = setup.endpoint.replace(/^https?:\/\//, "");
  const providerIds = setup.providers.map((provider) => provider.catalog_id);

  return (
    <>
      <div className={"mt-4"}>
        <EndpointBadge endpoint={bareEndpoint} />
      </div>

      <div className={"max-w-3xl"}>
        {/* Same 16px step the endpoint card sits below the description by. */}
        <AgentConnectTabs
          endpoint={bareEndpoint}
          className={"mt-4"}
          listClassName={"px-0"}
          contentClassName={"px-0 py-2"}
          providerIds={providerIds}
        />
      </div>

      <div className={"max-w-3xl"}>
        <h2 className={"text-base mt-8 mb-0"}>Your Providers &amp; Models</h2>
        <ConnectProvidersTable providers={setup.providers} />
      </div>
    </>
  );
}
