"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { CheckCircle2 } from "lucide-react";
import React from "react";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import PageContainer from "@/layouts/PageContainer";
import EndpointBadge from "@/modules/agent-network/EndpointBadge";
import {
  APIMeSetup,
  useMyAgentNetworkSetup,
} from "@/modules/agent-network/useMyAgentNetworkSetup";

// MyAgentNetworkPage is the caller-scoped self-service view: the endpoint to
// configure tools with — presented exactly like the providers page presents
// it, Copy and Agent Config included — plus the providers and models the
// caller's own policies allow. It needs no agent_network permission (the
// backing endpoint answers for the caller only), so every role, including
// plain users in the limited view, can use it whenever their setup is
// configured. The caller's own usage lives on the regular Usage & Logs page,
// which the server scopes to them.
export default function MyAgentNetworkPage() {
  const { setup, configured, isLoading } = useMyAgentNetworkSetup();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/agent-network/my-setup"}
            label={"Agent Network"}
            icon={<AgentNetworkIcon size={16} />}
          />
          <Breadcrumbs.Item
            href={"/agent-network/my-setup"}
            label={"My Setup"}
            active
          />
        </Breadcrumbs>
        <h1>My Setup</h1>
        <Paragraph>
          Point your agent at the NetBird endpoint as its base URL. No provider
          API key is needed on the client — NetBird authorizes each request
          against your access policies and injects the upstream key.
        </Paragraph>

        {isLoading ? (
          <div className={"mt-4"}>
            <SkeletonTable />
          </div>
        ) : configured && setup ? (
          <MySetupContent setup={setup} />
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

function MySetupContent({ setup }: { setup: APIMeSetup }) {
  // EndpointBadge builds https:// URLs from a bare host.
  const bareEndpoint = setup.endpoint.replace(/^https?:\/\//, "");

  return (
    <>
      <div className={"mt-4"}>
        <EndpointBadge
          endpoint={bareEndpoint}
          providerIds={setup.providers.map((provider) => provider.catalog_id)}
        />
      </div>

      <div className={"max-w-3xl"}>
        <h2 className={"text-base mt-8 mb-0"}>Your providers & models</h2>
        <table className={"w-full text-sm mt-2"}>
          <thead>
            <tr
              className={
                "text-left text-xs uppercase tracking-wide text-nb-gray-500 border-b border-nb-gray-920"
              }
            >
              <th className={"py-2 pr-4 font-medium"}>Provider</th>
              <th className={"py-2 pr-4 font-medium"}>API</th>
              <th className={"py-2 font-medium"}>Available models</th>
            </tr>
          </thead>
          <tbody>
            {setup.providers.map((provider) => (
              <tr
                key={provider.name}
                className={"border-b border-nb-gray-930 last:border-b-0"}
              >
                <td
                  className={
                    "py-3 pr-4 font-medium text-nb-gray-100 whitespace-nowrap"
                  }
                >
                  {provider.name}
                </td>
                <td className={"py-3 pr-4"}>
                  <span
                    className={
                      "text-xs text-nb-gray-300 bg-nb-gray-920 rounded-full px-2.5 py-0.5"
                    }
                  >
                    {provider.api_flavor}
                  </span>
                </td>
                <td className={"py-3"}>
                  {provider.all_models_allowed ? (
                    <span
                      className={
                        "inline-flex items-center gap-1.5 text-green-400 text-xs"
                      }
                    >
                      <CheckCircle2 size={13} />
                      All models
                    </span>
                  ) : (
                    <div className={"flex flex-wrap gap-1.5"}>
                      {provider.models.map((model) => (
                        <span
                          key={model}
                          className={
                            "text-xs font-mono text-nb-gray-200 bg-nb-gray-920 border border-nb-gray-900 rounded-full px-2.5 py-0.5"
                          }
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
