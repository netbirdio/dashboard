import type { Meta } from "@storybook/nextjs-vite";
import { screen } from "storybook/test";
import InsightsOverviewPage from "@/app/(dashboard)/agent-network/insights/overview/page";
import AgentPoliciesPage from "@/app/(dashboard)/agent-network/policies/page";
import TrafficEventsPage from "@/app/(dashboard)/events/traffic/page";
import GroupsPage from "@/app/(dashboard)/groups/page";
import PeersPage from "@/app/(dashboard)/peers/page";
import ServiceUsersPage from "@/app/(dashboard)/team/service-users/page";
import {
  click,
  inLayout,
  nav,
  resetStorage,
  type Story,
  text,
  until,
} from "@/storybook/core";
import {
  account,
  freeSubscription,
  trialSubscription,
} from "@/storybook/fixtures";

/* One sidebar for both products (navigation option B): what both work with
   at the top (Control Center, Peers, Users, Groups), Networking and Agent
   Network as collapsible sections, and the account area at the bottom. */
const meta: Meta = {
  title: "Pages/Core/Navigation",
  parameters: nav("/peers"),
  beforeEach: resetStorage,
  render: inLayout(PeersPage),
};
export default meta;

const peersLoaded = () => text("olivias-macbook-pro");

const section = (label: string) =>
  until(() => {
    const heading = [
      ...document.querySelectorAll<HTMLElement>(
        "[data-navigation] [data-testid=left-navigation-section]",
      ),
    ].find((el) => el.textContent?.startsWith(label));
    if (!heading) throw new Error(`no ${label} section`);
    return heading;
  });

/* The desktop sidebar; the mobile drawer holds a second copy. */
const sidebar = () =>
  document.querySelector<HTMLElement>("[data-navigation].md\\:block")!;

/* Both products on, on a page both use: every section is open and none is
   highlighted. */
export const BothProducts: Story = {
  play: async () => {
    await peersLoaded();
    await section("Agent Network");
  },
};

export const BothProductsCloud: Story = {
  tags: ["cloud"],
  play: BothProducts.play,
};

/* NetBird Cloud on the Free plan: the plan card with its usage and Upgrade
   button closes the sidebar, below the account area. Usage stays under the
   Free limits, so no limits dialog covers the page. */
export const BothProductsCloudFreePlan: Story = {
  tags: ["cloud"],
  parameters: {
    api: {
      "GET /integrations/billing/subscription": freeSubscription,
      "GET /integrations/billing/usage": {
        active_users: 3,
        total_users: 3,
        active_peers: 12,
        total_peers: 12,
      },
    },
  },
  play: async () => {
    await peersLoaded();
    await text("Upgrade Plan");
  },
};

/* NetBird Cloud during the trial: the trial card in the same place. */
export const BothProductsCloudTrial: Story = {
  tags: ["cloud"],
  parameters: {
    api: { "GET /integrations/billing/subscription": trialSubscription },
  },
  play: async () => {
    await peersLoaded();
    await section("Account");
  },
};

/* An account focused on Agent Network (agent_network_only): no Networking
   section; the pages both products use and the account area stay. */
export const AgentNetworkOnly: Story = {
  parameters: {
    api: {
      "GET /accounts": [
        {
          ...account,
          settings: { ...account.settings, agent_network_only: true },
        },
      ],
    },
  },
  play: async () => {
    await peersLoaded();
    await section("Agent Network");
  },
};

/* A deployment without Agent Network: no Agent Network section. */
export const NetworkingOnly: Story = {
  tags: ["agent-network-off"],
  play: async () => {
    await peersLoaded();
    await section("Networking");
  },
};

/* A Networking page: the section is highlighted and its group open. */
export const NetworkingPage: Story = {
  parameters: nav("/events/traffic"),
  render: inLayout(TrafficEventsPage),
  play: async () => {
    await section("Networking");
    await text("Traffic Events");
  },
};

/* Groups, at the top for both products: no section is highlighted. */
export const GroupsPageShared: Story = {
  parameters: nav("/groups"),
  render: inLayout(GroupsPage),
  play: async () => {
    await text("Office Berlin");
    await section("Account");
  },
};

/* An Agent Network page: Agents › Agent Policies, renamed so it doesn't
   clash with Networking's Access Control › Policies. */
export const AgentNetworkPage: Story = {
  parameters: nav("/agent-network/policies"),
  render: inLayout(AgentPoliciesPage),
  play: async () => {
    await text("Engineering → Claude & OpenAI");
    await section("Agent Network");
  },
};

/* The Insights pages are placeholders: on under npm run dev and here, behind
   NETBIRD_AGENT_NETWORK_INSIGHTS in production builds. */
export const InsightsPlaceholder: Story = {
  parameters: nav("/agent-network/insights/overview"),
  render: inLayout(InsightsOverviewPage),
  play: async () => {
    await text("Not built yet");
    await section("Agent Network");
  },
};

/* The account area: Settings, Integrations, Service Users, Audit Events
   and Documentation, on the Service Users page. */
export const AccountArea: Story = {
  parameters: nav("/team/service-users"),
  render: inLayout(ServiceUsersPage),
  play: async () => {
    await text("CI/CD Pipeline");
    await section("Account");
  },
};

/* Both product sections closed by the user; remembered in localStorage. */
export const ClosedSections: Story = {
  play: async () => {
    await peersLoaded();
    await click(section("Networking"));
    await click(section("Agent Network"));
    await until(() => {
      if (screen.queryByText("Traffic Events"))
        throw new Error("Networking still open");
    });
    // The clicked heading keeps focus; the shot is about the closed state.
    (document.activeElement as HTMLElement | null)?.blur();
  },
};

/* The icon-only sidebar, on a Networking page. */
export const CollapsedSidebar: Story = {
  parameters: nav("/events/traffic"),
  render: inLayout(TrafficEventsPage),
  play: async () => {
    await section("Networking");
    await click(
      document.querySelector<HTMLElement>("[data-navbar-colappse-toggle]")!,
    );
    await until(() => {
      if (sidebar().getBoundingClientRect().width > 100)
        throw new Error("sidebar not collapsed yet");
    });
  },
};

/* The mobile drawer. The menu button only shows on small screens, so it is
   clicked directly; the drawer then opens at any width. */
export const MobileDrawer: Story = {
  play: async () => {
    await peersLoaded();
    document
      .querySelector<HTMLElement>("button.md\\:hidden, .md\\:hidden button")
      ?.click();
    await until(() => {
      if (document.querySelectorAll("[data-navigation]").length < 2)
        throw new Error("drawer not open");
    });
  },
};
