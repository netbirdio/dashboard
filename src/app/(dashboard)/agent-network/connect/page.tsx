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
import { useMyAgentNetworkSetup } from "@/modules/agent-network/useMyAgentNetworkSetup";

// ConnectAgentPage is the caller-scoped self-service view: the endpoint to
// configure tools with and the per-tool config that goes with it — the one
// place the agent config lives — plus the providers and models the caller's
// own policies allow. It needs no agent_network permission (the backing
// endpoint answers for the caller only), so every role, including plain users
// in the limited view, gets the same config. A caller no policy covers yet
// still gets it, with an empty provider list carrying the explanation. The caller's own usage lives on the regular Usage & Logs page,
// which the server scopes to them.
export default function ConnectAgentPage() {
  const { setup, isLoading } = useMyAgentNetworkSetup();
  const providers = setup?.providers ?? [];
  // EndpointBadge builds https:// URLs from a bare host.
  const bareEndpoint = (setup?.endpoint ?? "").replace(/^https?:\/\//, "");
  const providerIds = providers.map((provider) => provider.catalog_id);

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
        {/* block, so the <br /> lands: Paragraph is a flex container by
            default and a break element does nothing between flex items. */}
        <Paragraph className={"block"}>
          Point your agent at the NetBird endpoint as its base URL. No provider
          API key is required on the client. <br />
          NetBird authenticates you through your identity provider and
          authorizes each request against your access policies.
        </Paragraph>

        {/* The server hands the endpoint to every member of an account that
            has Agent Network set up, covered by a policy or not, so this
            renders for everyone; it stays guarded because an account with no
            endpoint yet has nothing to copy and no snippet that would work.
            mt-6 is the step the users and activity pages put between their
            description and the card below it. */}
        {!isLoading && bareEndpoint && (
          <div className={"mt-6"}>
            <EndpointBadge endpoint={bareEndpoint} variant={"plain"} />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className={"p-default"}>
          <SkeletonTable />
        </div>
      ) : (
        <>
          {/* Only the tab strip spans the page, so its underline runs edge to
              edge the way it does on every other tabbed page. The triggers and
              the snippets below them keep the page gutter and the reading
              width the rest of the page is set in. */}
          {bareEndpoint && (
            <AgentConnectTabs
              endpoint={bareEndpoint}
              className={"mt-0"}
              listClassName={"p-default"}
              contentClassName={"p-default py-2 max-w-3xl"}
              providerIds={providerIds}
            />
          )}

          {/* Same box as the tab content above — gutter and max-width on one
              element — so the table lines up with the snippets. */}
          <div className={"p-default pt-8 pb-10 max-w-3xl"}>
            <h2 className={"text-base mb-0"}>Your Providers &amp; Models</h2>
            <ConnectProvidersTable providers={providers} />
          </div>
        </>
      )}
    </PageContainer>
  );
}
