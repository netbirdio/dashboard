/**
 * The planned Agent Network Insights pages. They are navigation placeholders
 * until the analytics exist, and only show where the deployment switches
 * them on (NETBIRD_AGENT_NETWORK_INSIGHTS, see isAgentNetworkInsightsEnabled).
 */
export const INSIGHTS_ROOT = "/agent-network/insights";

export const INSIGHTS_PAGES = [
  {
    slug: "overview",
    label: "Overview",
    description:
      "Requests, tokens and spend across every provider, with the trend against the previous period.",
  },
  {
    slug: "models",
    label: "Models",
    description:
      "Which models your agents call, how often, and what each one costs.",
  },
  {
    slug: "tasks",
    label: "Tasks",
    description:
      "What agents are used for, grouped by the kind of work in each request.",
  },
  {
    slug: "departments",
    label: "Departments",
    description:
      "Usage and spend per team, from the IdP groups your policies are built on.",
  },
] as const;

export type InsightsPage = (typeof INSIGHTS_PAGES)[number]["slug"];

export const insightsHref = (page: InsightsPage) => `${INSIGHTS_ROOT}/${page}`;
