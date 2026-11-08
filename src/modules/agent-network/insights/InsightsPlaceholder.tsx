"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import { Callout } from "@components/Callout";
import Paragraph from "@components/Paragraph";
import { SmallBadge } from "@components/ui/SmallBadge";
import { ChartColumnIcon } from "lucide-react";
import * as React from "react";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import PageContainer from "@/layouts/PageContainer";

export type InsightsPage = "overview" | "models" | "tasks" | "departments";

/**
 * What each Insights page is meant to show. None of it exists yet: the
 * pages are placeholders behind NETBIRD_AGENT_NETWORK_INSIGHTS_PREVIEW so
 * the navigation can be judged with them in place.
 */
export const INSIGHTS_PAGES: Record<
  InsightsPage,
  {
    title: string;
    href: string;
    description: string;
    panels: { title: string; description: string }[];
  }
> = {
  overview: {
    title: "Overview",
    href: "/agent-network/insights",
    description:
      "How your organization uses AI agents: requests, tokens and spend across every provider.",
    panels: [
      { title: "Requests", description: "Agent requests over time" },
      { title: "Tokens", description: "Input and output tokens over time" },
      { title: "Spend", description: "Estimated cost by provider" },
      { title: "Active agents", description: "Peers that sent requests" },
    ],
  },
  models: {
    title: "Models",
    href: "/agent-network/insights/models",
    description:
      "Which models your agents call, what they cost and how they perform.",
    panels: [
      { title: "Usage by model", description: "Requests and tokens per model" },
      { title: "Cost by model", description: "Estimated spend per model" },
      { title: "Latency", description: "Response times per model" },
      { title: "Errors", description: "Refused and failed requests" },
    ],
  },
  tasks: {
    title: "Tasks",
    href: "/agent-network/insights/tasks",
    description: "What your agents are used for, grouped by the kind of task.",
    panels: [
      { title: "Top tasks", description: "The most common kinds of task" },
      { title: "Tokens per task", description: "Which tasks use the most" },
      { title: "Trends", description: "How the task mix changes over time" },
    ],
  },
  departments: {
    title: "Departments",
    href: "/agent-network/insights/departments",
    description:
      "AI usage and spend by department, from the groups your identity provider syncs.",
    panels: [
      { title: "Spend by department", description: "Estimated cost per group" },
      { title: "Adoption", description: "Users per department using agents" },
      { title: "Top models", description: "Each department's most used models" },
    ],
  },
};

/** A placeholder Insights page: the heading, the plan, no data. */
export default function InsightsPlaceholder({
  page,
}: Readonly<{ page: InsightsPage }>) {
  const { title, href, description, panels } = INSIGHTS_PAGES[page];
  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/agent-network/providers"}
            label={"Agent Network"}
            icon={<AgentNetworkIcon size={16} />}
          />
          <Breadcrumbs.Item
            href={INSIGHTS_PAGES.overview.href}
            label={"Insights"}
            icon={<ChartColumnIcon size={14} />}
          />
          <Breadcrumbs.Item href={href} label={title} active />
        </Breadcrumbs>
        <div className={"flex items-center gap-3"}>
          <h1>{title}</h1>
          <SmallBadge text={"Preview"} variant={"yellow"} size={"md"} />
        </div>
        <Paragraph>{description}</Paragraph>
        <div className={"mt-6 max-w-4xl"}>
          <Callout variant={"info"} data-testid={"insights-placeholder"}>
            Placeholder. Insights is not built yet; this page shows where it
            will sit and what it will cover. It only appears with
            NETBIRD_AGENT_NETWORK_INSIGHTS_PREVIEW set.
          </Callout>
        </div>
        <div className={"mt-6 grid gap-4 sm:grid-cols-2 max-w-4xl"}>
          {panels.map((panel) => (
            <div
              key={panel.title}
              className={
                "rounded-md border border-dashed border-nb-gray-800 bg-nb-gray-930/40 px-5 py-6"
              }
            >
              <div className={"text-sm font-medium text-nb-gray-200"}>
                {panel.title}
              </div>
              <div className={"text-xs text-nb-gray-400 mt-1"}>
                {panel.description}
              </div>
              <div
                className={"mt-5 h-20 rounded bg-nb-gray-900/40"}
                aria-hidden
              />
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
