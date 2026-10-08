import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { screen } from "storybook/test";
import NetworkRoutesPage from "@/app/(dashboard)/network-routes/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  clickSelector,
  clickTab,
  clickText,
  findDialog,
  findText,
  markRow,
  settleMotion,
  user,
  waitForPopup,
} from "@/storybook/network";

const meta: Meta = {
  title: "Pages/Network/Network Routes",
  afterEach: settleMotion,
  parameters: { nextjs: { navigation: { pathname: "/network-routes" } } },
  render: () => (
    <DashboardLayout>
      <NetworkRoutesPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const ready = async () => {
  await findText("office-lan");
};

/* Grouped rows expand into the routes that share a network identifier. */
const expand = async (networkId: string) => {
  await clickText(networkId);
  const actions = await screen.findAllByLabelText("Route actions", undefined, {
    timeout: 15000,
  });
  // The page scrolls inside its own container, so bring the expanded routes into the shot.
  actions[actions.length - 1].scrollIntoView({ block: "center" });
};

const openEdit = async (networkId: string) => {
  await expand(networkId);
  const [trigger] = screen.getAllByLabelText("Route actions");
  await user.click(trigger);
  await waitForPopup("menu");
  await clickText("Edit");
  await findDialog();
};

export const List: Story = { play: ready };

export const Empty: Story = {
  parameters: { api: { "GET /routes": [] } },
  play: async () => {
    await findText(/Add Route/);
  },
};

export const RowHover: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await markRow("internal-domains");
  },
};

export const HighAvailabilityExpanded: Story = {
  play: async () => {
    await expand("office-lan");
  },
};

export const ExitNodeExpanded: Story = {
  play: async () => {
    await expand("Exit Node Berlin");
  },
};

export const DomainRouteExpanded: Story = {
  play: async () => {
    await expand("internal-domains");
  },
};

export const RouteActions: Story = {
  play: async () => {
    await expand("office-lan");
    await user.click(screen.getAllByLabelText("Route actions")[0]);
    await waitForPopup("menu");
  },
};

export const AddRouteModal: Story = {
  play: async () => {
    await ready();
    await clickSelector("[data-testid='open-add-route']");
    await findDialog();
  },
};

export const AddExitNodeModal: Story = {
  play: async () => {
    await ready();
    await clickText(/Add Exit Node|Set Up Exit Node/);
    await findDialog();
  },
};

export const EditRouteModal: Story = {
  play: async () => {
    await openEdit("office-lan");
  },
};

export const EditRouteDescriptionTab: Story = {
  play: async () => {
    await openEdit("office-lan");
    await clickTab(/Description/);
  },
};

export const EditRouteSettingsTab: Story = {
  play: async () => {
    await openEdit("office-lan");
    await clickTab(/Settings/);
  },
};

export const EditDomainRoute: Story = {
  play: async () => {
    await openEdit("internal-domains");
  },
};

export const EditExitNode: Story = {
  play: async () => {
    await openEdit("Exit Node Berlin");
  },
};
