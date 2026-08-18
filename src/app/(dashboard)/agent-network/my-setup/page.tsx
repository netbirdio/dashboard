"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Code from "@components/Code";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { VerticalTabs } from "@components/VerticalTabs";
import * as Tabs from "@radix-ui/react-tabs";
import { CheckCircle2, Gauge, Plug } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React from "react";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import PageContainer from "@/layouts/PageContainer";
import { AgentConnectTabs } from "@/modules/agent-network/AgentConnectModal";
import { MyUsageOverview } from "@/modules/agent-network/AgentOverviewPanel";
import {
  APIMeSetup,
  useMyAgentNetworkSetup,
} from "@/modules/agent-network/useMyAgentNetworkSetup";

const TAB_SETUP = "setup";
const TAB_USAGE = "usage";
const TABS = new Set([TAB_SETUP, TAB_USAGE]);

// MyAgentNetworkPage is the caller-scoped self-service view: the providers
// and models the caller's own policies allow, the endpoint to configure
// tools with, and the caller's own consumption counters. It needs no
// agent_network permission — both backing endpoints answer for the caller
// only — so every role, including plain users in the limited view, can use
// it whenever their setup is configured.
export default function MyAgentNetworkPage() {
  const { setup, configured, isLoading } = useMyAgentNetworkSetup();
  const queryParams = useSearchParams();
  const queryTab = queryParams.get("tab");
  const router = useRouter();
  const pathname = usePathname();

  // The ?tab= query is the single source of truth, like the configuration
  // page: trigger clicks push it themselves, onChange covers Radix's
  // keyboard navigation, and unknown values fall back to the first tab.
  const tab = queryTab && TABS.has(queryTab) ? queryTab : TAB_SETUP;
  const onTabChange = (value: string) => {
    router.push(`${pathname}?tab=${value}`, { scroll: false });
  };

  return (
    <PageContainer>
      <VerticalTabs value={tab} onChange={onTabChange}>
        <VerticalTabs.List>
          <VerticalTabs.Trigger value={TAB_SETUP}>
            <Plug size={14} />
            My Setup
          </VerticalTabs.Trigger>
          <VerticalTabs.Trigger value={TAB_USAGE}>
            <Gauge size={14} />
            My Usage
          </VerticalTabs.Trigger>
        </VerticalTabs.List>
        <div className={"border-l border-nb-gray-930 w-full"}>
          <Tabs.Content value={TAB_SETUP} className={"w-full"}>
            <TabHeader
              label={"My Setup"}
              href={"/agent-network/my-setup?tab=setup"}
            >
              Point your agent at the NetBird endpoint as its base URL. No
              provider API key is needed on the client — NetBird authorizes each
              request against your access policies and injects the upstream key.
            </TabHeader>
            {isLoading ? (
              <div className={"px-8"}>
                <SkeletonTable />
              </div>
            ) : configured && setup ? (
              <MySetupContent setup={setup} />
            ) : (
              <EmptyState
                text={
                  "Agent Network is not set up for your user yet. Ask your administrator to add you to an access policy."
                }
              />
            )}
          </Tabs.Content>

          <Tabs.Content value={TAB_USAGE} className={"w-full"}>
            <TabHeader
              label={"My Usage"}
              href={"/agent-network/my-setup?tab=usage"}
            >
              Your own token consumption and spend, counted per aligned time
              window across every request you made through the Agent Network
              endpoint.
            </TabHeader>
            {configured ? (
              <MyUsageOverview />
            ) : (
              <EmptyState
                text={
                  "Agent Network is not set up for your user yet, so there is no usage to show."
                }
              />
            )}
          </Tabs.Content>
        </div>
      </VerticalTabs>
    </PageContainer>
  );
}

// TabHeader mirrors the breadcrumb + heading + description block the
// configuration page renders at the top of each tab.
function TabHeader({
  label,
  href,
  children,
}: {
  label: string;
  href: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={"p-default py-6 pb-2"}>
      <Breadcrumbs>
        <Breadcrumbs.Item
          href={"/agent-network/my-setup"}
          label={"Agent Network"}
          icon={<AgentNetworkIcon size={16} />}
        />
        <Breadcrumbs.Item href={href} label={label} active />
      </Breadcrumbs>
      <h1>{label}</h1>
      {children && <Paragraph>{children}</Paragraph>}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className={"p-default py-8 text-sm text-nb-gray-400 max-w-xl"}>
      {text}
    </div>
  );
}

function MySetupContent({ setup }: { setup: APIMeSetup }) {
  // AgentConnectTabs builds https:// URLs from a bare host.
  const bareEndpoint = setup.endpoint.replace(/^https?:\/\//, "");

  return (
    <div className={"p-default pt-2 pb-8 flex flex-col gap-2 max-w-3xl"}>
      <div className={"max-w-md"}>
        <Code codeToCopy={setup.endpoint} message={"Copied to clipboard"}>
          <Code.Line>{setup.endpoint}</Code.Line>
        </Code>
      </div>

      <h2 className={"text-base mt-6 mb-0"}>Your providers & models</h2>
      <table className={"w-full text-sm"}>
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

      <h2 className={"text-base mt-6 mb-0"}>Configure your agent</h2>
      <AgentConnectTabs
        endpoint={bareEndpoint}
        providerIds={setup.providers.map((provider) => provider.catalog_id)}
        listClassName={"px-0"}
        contentClassName={"py-2 px-0"}
      />
    </div>
  );
}
