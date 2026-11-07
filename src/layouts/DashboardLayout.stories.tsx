import type { Meta } from "@storybook/nextjs-vite";
import { fireEvent, screen } from "storybook/test";
import ProvidersPage from "@/app/(dashboard)/agent-network/providers/page";
import PeersPage from "@/app/(dashboard)/peers/page";
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

/* The product switch next to the logo, open, on a Networking page. */
export const ProductSwitcher: Story = {
  play: async () => {
    await loaded();
    await click(screen.findByTestId("product-switcher"));
    await menu();
  },
};

/* The Agent Network product: the switch shows it, the sidebar its pages. */
export const AgentNetworkProduct: Story = {
  parameters: nav("/agent-network/providers"),
  render: inLayout(ProvidersPage),
  play: async () => {
    await screen.findByTestId("product-switcher");
    await text("Connect Agent");
  },
};

export const AgentNetworkProductSwitcher: Story = {
  parameters: nav("/agent-network/providers"),
  render: inLayout(ProvidersPage),
  play: async () => {
    await text("Connect Agent");
    await click(screen.findByTestId("product-switcher"));
    await menu();
  },
};

/* Peers opened from the Agent Network view stays in Agent Network. */
export const AgentNetworkProductPeers: Story = {
  // The key of src/modules/agent-network/productStore.ts, written directly so
  // this file still builds against a baseline without that module.
  beforeEach: () => {
    sessionStorage.setItem("netbird-product", "agent-network");
    return () => sessionStorage.removeItem("netbird-product");
  },
  play: async () => {
    await loaded();
    await role("button", /Product: Agent Network/);
  },
};
