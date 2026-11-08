"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import NoResultsCard from "@components/ui/NoResultsCard";
import { SmallBadge } from "@components/ui/SmallBadge";
import React from "react";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import InsightsIcon from "@/assets/icons/InsightsIcon";
import PageContainer from "@/layouts/PageContainer";
import {
  INSIGHTS_PAGES,
  insightsHref,
  type InsightsPage,
} from "@/modules/agent-network/insights/insightsPages";

/**
 * A clearly marked stand-in for an Insights page, so the planned Agent
 * Network navigation can be clicked through before the analytics exist.
 */
export default function InsightsPlaceholderPage({
  page,
}: Readonly<{ page: InsightsPage }>) {
  const { label, description } =
    INSIGHTS_PAGES.find((p) => p.slug === page) ?? INSIGHTS_PAGES[0];

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/agent-network/usage"}
            label={"Agent Network"}
            icon={<AgentNetworkIcon size={16} />}
          />
          <Breadcrumbs.Item
            href={insightsHref("overview")}
            label={"Insights"}
          />
          <Breadcrumbs.Item
            href={insightsHref(page)}
            label={label}
            active={true}
          />
        </Breadcrumbs>
        <h1 className={"flex items-center gap-3"}>
          {label}
          <SmallBadge text={"Placeholder"} variant={"sky"} />
        </h1>
        <Paragraph>{description}</Paragraph>
      </div>
      <NoResultsCard
        icon={<InsightsIcon size={20} className={"fill-nb-gray-200"} />}
        title={"Not built yet"}
        description={
          "This page holds a place in the navigation prototype. Insights analytics are planned and have no data or design yet."
        }
      />
    </PageContainer>
  );
}
