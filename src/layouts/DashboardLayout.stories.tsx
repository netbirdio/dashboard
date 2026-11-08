import type { Meta } from "@storybook/nextjs-vite";
import { fireEvent, screen } from "storybook/test";
import ProvidersPage from "@/app/(dashboard)/agent-network/providers/page";
import GroupsPage from "@/app/(dashboard)/groups/page";
import PeersPage from "@/app/(dashboard)/peers/page";
import { account } from "@/storybook/fixtures";
import {
  click,
  inLayout,
  menu,
  nav,
  resetStorage,
  role,
  type Story,
  text,
  until,
} from "@/storybook/core";

/* The dashboard chrome (header, sidebar) around the Peers page. */
const meta: Meta = {
  title: "Pages/Core/Layout",
  parameters: nav("/peers"),
  beforeEach: resetStorage,
  render: inLayout(PeersPage),
};
export default meta;

const loaded = () => text("olivias-macbook-pro");

/* The help button is the only header menu trigger without a test id. */
const helpButton = () =>
  [
    ...document.querySelectorAll<HTMLButtonElement>(
      "button[aria-haspopup=menu]",
    ),
  ].find((b) => b.closest(".fixed") && !b.dataset.testid)!;

export const UserDropdown: Story = {
  play: async () => {
    await loaded();
    await click(screen.findByTestId("user-dropdown"));
    await menu();
  },
};

export const CloudUserDropdown: Story = {
  tags: ["cloud"],
  play: UserDropdown.play,
};

export const HelpMenu: Story = {
  play: async () => {
    await loaded();
    await click(helpButton());
    await menu();
  },
};

export const CollapsedSidebar: Story = {
  play: async () => {
    await loaded();
    await click(
      document.querySelector<HTMLElement>("[data-navbar-colappse-toggle]")!,
    );
  },
};

export const CloudSidebar: Story = {
  tags: ["cloud"],
  play: async () => void (await loaded()),
};

export const CloudCollapsedSidebar: Story = {
  tags: ["cloud"],
  play: CollapsedSidebar.play,
};

export const SidebarHover: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await loaded();
    (await text("Settings"))
      .closest("button, a")
      ?.setAttribute("data-capture", "");
  },
};

/* Cmd/Ctrl+K ("mod+k") focuses the table search, the dashboard's quick search. */
export const SearchShortcut: Story = {
  play: async () => {
    await loaded();
    const search = await screen.findByTestId("table-search-input");
    // A plain keydown, so no "k" is typed into the input once it has focus.
    fireEvent.keyDown(document, { key: "k", code: "KeyK", metaKey: true });
    if (document.activeElement !== search) {
      fireEvent.keyDown(document, { key: "k", code: "KeyK", ctrlKey: true });
    }
    await until(() => {
      if (document.activeElement !== search)
        throw new Error("search not focused");
    });
  },
};

export const ExpandedNavigationGroup: Story = {
  play: async () => {
    await loaded();
    await click((await text("Access Control")).closest("button")!);
    await text("Posture Checks");
    await click((await text("Network Routing")).closest("button")!);
  },
};

/* ---------------------------------------------------------------------
   Products. Networking and Agent Network each have a sidebar; the header
   switch picks one, and the account area below it is the same in both.
   A page both products show (Control Center, Peers, the account area) has
   one URL and names its product in it: `?product=agent-network`. */

const productSwitch = () => screen.findByTestId("product-switcher");

/* A click leaves the focus ring on what it clicked; the shot is about the
   state it opened. */
const blur = () => (document.activeElement as HTMLElement | null)?.blur();

/* The breadcrumb trail's first crumb, which names the product. */
const crumbRoot = async (label: string) => {
  await until(() => {
    const first = document.querySelector("[data-testid=breadcrumb-item]");
    if (first?.textContent !== label)
      throw new Error(`breadcrumb root is not ${label}`);
  });
};

/* The Networking sidebar on Peers: Access Control, Network Routing, Reverse
   Proxy, DNS and Activity, then the account area. */
export const NetworkingProduct: Story = {
  parameters: nav("/peers", { product: "networking" }),
  play: async () => {
    await loaded();
    await role("button", /Product: Networking/);
    await crumbRoot("Networking");
  },
};

/* The product switch next to the logo, open, on a Networking page. */
export const ProductSwitcher: Story = {
  parameters: nav("/peers", { product: "networking" }),
  play: async () => {
    await loaded();
    await click(productSwitch());
    await menu();
  },
};

/* The Agent Network sidebar: Insights (a preview), Usage & Logs, Agents and
   Configuration, with Control Center and Peers from both products. */
export const AgentNetworkProduct: Story = {
  parameters: nav("/agent-network/providers"),
  render: inLayout(ProvidersPage),
  play: async () => {
    await productSwitch();
    await text("Agent Policies");
    await click((await text("Insights")).closest("button")!);
    await text("Departments");
    blur();
  },
};

export const AgentNetworkProductSwitcher: Story = {
  parameters: nav("/agent-network/providers"),
  render: inLayout(ProvidersPage),
  play: async () => {
    await text("Agent Policies");
    await click(productSwitch());
    await menu();
  },
};

/* Peers opened from Agent Network: one URL with the product in it, so the
   switch, the sidebar and the breadcrumb all say Agent Network. */
export const AgentNetworkProductPeers: Story = {
  parameters: nav("/peers", { product: "agent-network" }),
  play: async () => {
    await loaded();
    await role("button", /Product: Agent Network/);
    await crumbRoot("Agent Network");
  },
};

/* The account area, the same in both products: Team (with Groups), Audit
   Events, Settings, Integrations and Documentation. Groups opened from
   Agent Network stays in Agent Network. */
export const AccountArea: Story = {
  parameters: nav("/groups", { product: "agent-network" }),
  render: inLayout(GroupsPage),
  play: async () => {
    await role("button", /Product: Agent Network/);
    await crumbRoot("Agent Network");
    await text("Service Users");
  },
};

export const NetworkingAccountArea: Story = {
  parameters: nav("/groups", { product: "networking" }),
  render: inLayout(GroupsPage),
  play: async () => {
    await role("button", /Product: Networking/);
    await crumbRoot("Networking");
    await text("Service Users");
  },
};

/* An Agent Network only account (agent_network_only, or the
   NETBIRD_AGENT_NETWORK_ONLY deployment flag): no switch, the Agent
   Network sidebar, the shared pages and the account area. */
export const AgentNetworkOnlyAccount: Story = {
  parameters: {
    ...nav("/peers"),
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
    await loaded();
    await text("Usage & Logs");
    await crumbRoot("Agent Network");
    if (document.querySelector("[data-testid=product-switcher]"))
      throw new Error("an Agent Network only account has no product switch");
  },
};

const collapse = async () => {
  await click(
    document.querySelector<HTMLElement>("[data-navbar-colappse-toggle]")!,
  );
  blur();
};

/* The Agent Network sidebar collapsed to icons; the account heading hides
   with the labels. */
export const AgentNetworkCollapsedSidebar: Story = {
  parameters: nav("/peers", { product: "agent-network" }),
  play: async () => {
    await loaded();
    await text("Usage & Logs");
    await collapse();
  },
};

/* Hovering the collapsed sidebar opens it over the page. */
export const AgentNetworkCollapsedSidebarHover: Story = {
  tags: ["capture-hover"],
  parameters: nav("/peers", { product: "agent-network" }),
  play: async () => {
    await loaded();
    await text("Usage & Logs");
    await collapse();
    (await text("Usage & Logs"))
      .closest("button")
      ?.setAttribute("data-capture", "");
  },
};

/* The mobile drawer in Agent Network. The menu button only shows below the
   md breakpoint, so it is clicked through the DOM. */
export const AgentNetworkMobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  parameters: nav("/peers", { product: "agent-network" }),
  play: async () => {
    await loaded();
    fireEvent.click(await screen.findByTestId("mobile-navigation-toggle"));
    await until(() => {
      if (document.querySelectorAll("[data-navigation]").length < 2)
        throw new Error("mobile drawer not open");
    });
  },
};

export const NetworkingMobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  parameters: nav("/peers", { product: "networking" }),
  play: AgentNetworkMobile.play,
};
