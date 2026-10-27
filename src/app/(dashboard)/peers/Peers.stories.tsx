import type { Meta } from "@storybook/nextjs-vite";
import { screen, userEvent } from "storybook/test";
import PeersPage from "@/app/(dashboard)/peers/page";
import {
  click,
  clickRole,
  clickText,
  dialog,
  inLayout,
  markCapture,
  menu,
  nav,
  openRowMenu,
  resetStorage,
  role,
  type Story,
  text,
  until,
} from "@/storybook/core";

const meta: Meta = {
  title: "Pages/Core/Peers",
  parameters: nav("/peers"),
  beforeEach: resetStorage,
  render: inLayout(PeersPage),
};
export default meta;

const loaded = () => text("olivias-macbook-pro");

const firstRow = async () => (await text("router-berlin")).closest("tr")!;

export const List: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await firstRow();
    markCapture(document.querySelector("[data-testid=peer-name-cell]"));
  },
};

export const UserDevices: Story = {
  parameters: nav("/peers", { kind: "users" }),
  play: async () => {
    await text("dana.developer@netbird.io");
  },
};

export const Servers: Story = {
  parameters: nav("/peers", { kind: "servers" }),
  play: async () => {
    await text("db-primary");
  },
};

export const Empty: Story = {
  parameters: { api: { "GET /peers": [] } },
  play: async () => {
    await text("Get Started with NetBird");
  },
};

export const FiltersOpen: Story = {
  play: async () => {
    await loaded();
    await click(screen.findByTestId("table-filters-button"));
    await screen.findByTestId("table-filter-os_kind");
  },
};

export const FilterStatusPicker: Story = {
  play: async () => {
    await loaded();
    await click(screen.findByTestId("table-filters-button"));
    await click(screen.findByTestId("table-filter-connected"));
    await role("button", "Back");
  },
};

export const FilterOperatingSystemPicker: Story = {
  play: async () => {
    await loaded();
    await click(screen.findByTestId("table-filters-button"));
    await click(screen.findByTestId("table-filter-os_kind"));
    await text("macOS");
  },
};

export const FilterGroupsPicker: Story = {
  play: async () => {
    await loaded();
    await click(screen.findByTestId("table-filters-button"));
    await click(screen.findByTestId("table-filter-group_names"));
    await role("button", "Back");
  },
};

export const FilterUsersPicker: Story = {
  parameters: nav("/peers", { kind: "users" }),
  play: async () => {
    await text("dana.developer@netbird.io");
    await click(screen.findByTestId("table-filters-button"));
    await click(screen.findByTestId("table-filter-user_email"));
    await role("button", "Back");
  },
};

export const PendingApprovalsFilter: Story = {
  play: async () => {
    await loaded();
    await clickRole("button", /Pending Approvals/);
    await text("contractor-laptop");
  },
};

export const BrowserPeers: Story = {
  play: async () => {
    await loaded();
    const toggle = document
      .querySelector(".lucide-monitor-dot")
      ?.closest("button");
    await click(toggle!);
    await text("netbird-browser-7f3a");
  },
};

export const RowActionMenu: Story = {
  play: async () => {
    await openRowMenu(await firstRow());
  },
};

export const BulkSelection: Story = {
  play: async () => {
    await loaded();
    const boxes = await screen.findAllByRole("checkbox", {
      name: "Select row",
    });
    await click(boxes[0]);
    await click(boxes[1]);
    await click(boxes[2]);
  },
};

export const AddPeerDropdown: Story = {
  play: async () => {
    await loaded();
    await click(screen.findByTestId("add-peer-button"));
    await menu();
  },
};

const openSetup =
  (mode: string, tab?: string): Story["play"] =>
  async () => {
    await loaded();
    await click(screen.findByTestId("add-peer-button"));
    await clickRole("menuitem", mode);
    await dialog();
    if (tab) await clickRole("tab", tab);
  };

export const SetupUserDeviceLinux: Story = {
  play: openSetup("User Device", "Linux"),
};
export const SetupUserDeviceWindows: Story = {
  play: openSetup("User Device", "Windows"),
};
export const SetupUserDeviceMacOS: Story = {
  play: openSetup("User Device", "macOS"),
};
export const SetupUserDeviceIOS: Story = {
  play: openSetup("User Device", "iOS"),
};
export const SetupUserDeviceAndroid: Story = {
  play: openSetup("User Device", "Android"),
};
export const SetupServer: Story = { play: openSetup("Server") };
export const SetupServerWindows: Story = {
  play: openSetup("Server", "Windows"),
};
export const SetupServerDocker: Story = { play: openSetup("Server", "Docker") };
export const SetupAgent: Story = { play: openSetup("Agent") };

export const Search: Story = {
  play: async () => {
    await loaded();
    const input = await screen.findByPlaceholderText(/Search by name/);
    await click(input);
    await userEvent.type(input, "router");
    await until(() => {
      if (screen.queryByText("olivias-macbook-pro"))
        throw new Error("not filtered yet");
    });
  },
};

export const CloudList: Story = {
  tags: ["cloud"],
  play: async () => {
    await loaded();
  },
};

export const CloudBypassedFilter: Story = {
  tags: ["cloud"],
  play: async () => {
    await loaded();
    await clickText("Bypassed");
    await until(() => {
      if (screen.queryByText("olivias-macbook-pro"))
        throw new Error("not filtered yet");
    });
  },
};
