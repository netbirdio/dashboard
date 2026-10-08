import type { Meta } from "@storybook/nextjs-vite";
import { screen } from "storybook/test";
import PeerPage from "@/app/(dashboard)/peer/page";
import {
  click,
  clickRole,
  clickText,
  dialog,
  inLayout,
  menu,
  nav,
  resetStorage,
  role,
  type Story,
  text,
  until,
} from "@/storybook/core";

const peer = (id: string) => nav("/peer", { id });

const meta: Meta = {
  title: "Pages/Core/Peer",
  parameters: peer("peer-macbook"),
  beforeEach: resetStorage,
  render: inLayout(PeerPage),
};
export default meta;

const loaded = () => role("tab", /Overview/);
const openTab = (name: RegExp) => async () => {
  await loaded();
  await clickRole("tab", name);
};

export const UserDevice: Story = { play: async () => void (await loaded()) };
export const Server: Story = {
  parameters: peer("peer-web-server"),
  play: async () => void (await loaded()),
};
export const RoutingPeer: Story = {
  parameters: peer("peer-router-berlin"),
  play: async () => void (await loaded()),
};
export const LoginExpired: Story = {
  parameters: peer("peer-login-expired"),
  play: async () => void (await loaded()),
};
export const PendingApproval: Story = {
  parameters: peer("peer-pending-approval"),
  play: async () => void (await loaded()),
};
export const OfflineLongName: Story = {
  parameters: peer("peer-offline-laptop"),
  play: async () => void (await loaded()),
};
export const Mobile: Story = {
  parameters: peer("peer-iphone"),
  play: async () => void (await loaded()),
};
export const BrowserClient: Story = {
  parameters: peer("peer-browser-client"),
  play: async () => void (await loaded()),
};
export const CloudUserDevice: Story = {
  tags: ["cloud"],
  play: async () => void (await loaded()),
};

export const NetworkRoutesTab: Story = {
  parameters: peer("peer-router-berlin"),
  play: openTab(/Network Routes/),
};

export const AccessiblePeersTab: Story = {
  play: async () => {
    await openTab(/Accessible Peers/)();
    await text("db-primary");
  },
};

export const ServicesTab: Story = {
  parameters: peer("peer-web-server"),
  play: openTab(/Service/),
};

export const RemoteJobsTab: Story = {
  play: async () => {
    await openTab(/Remote Jobs/)();
    await text("peer is offline");
  },
};

export const CloudTrafficEventsTab: Story = {
  tags: ["cloud"],
  play: openTab(/Traffic Events/),
};

export const EditNameModal: Story = {
  play: async () => {
    await loaded();
    const pencil = document.querySelector(
      "h1 ~ * .lucide-pencil, .lucide-pencil",
    );
    await click(pencil!.closest("div")!);
    await dialog();
  },
};

export const EditIPModal: Story = {
  play: async () => {
    await loaded();
    await text("100.92.14.21");
    const edit = await until(() => {
      const button = [...document.querySelectorAll("button")].find(
        (b) => b.parentElement?.textContent?.startsWith("100.92.14.21"),
      );
      if (!button) throw new Error("edit button not found");
      return button;
    });
    await click(edit);
    await dialog();
  },
};

export const GroupsSelectorOpen: Story = {
  play: async () => {
    await loaded();
    await text("Assigned Groups");
    const trigger = await until(() => {
      const label = [...document.querySelectorAll("label")].find(
        (l) => l.textContent === "Assigned Groups",
      );
      const button = label?.parentElement?.querySelector("button");
      if (!button) throw new Error("group selector not found");
      return button;
    });
    await click(trigger);
    await screen.findByPlaceholderText(/Search/i, {}, { timeout: 10_000 });
  },
};

export const EnableSSHModal: Story = {
  play: async () => {
    await loaded();
    await clickRole("button", /Enable SSH Access/);
    await dialog();
  },
};

export const DisableSSHConfirm: Story = {
  parameters: peer("peer-web-server"),
  play: async () => {
    await loaded();
    const label = await text("SSH Access");
    await click(
      label
        .closest("div:has(button[role=switch])")!
        .querySelector("button[role=switch]")!,
    );
    await dialog();
  },
};

export const AddRouteDropdown: Story = {
  parameters: peer("peer-router-berlin"),
  play: async () => {
    await openTab(/Network Routes/)();
    await clickRole("button", /Add Route/);
    await menu();
  },
};

export const NewNetworkRouteModal: Story = {
  parameters: peer("peer-router-berlin"),
  play: async () => {
    await openTab(/Network Routes/)();
    await clickRole("button", /Add Route/);
    await clickText("New Network Route");
    await dialog();
  },
};

export const ExistingNetworkModal: Story = {
  parameters: peer("peer-router-berlin"),
  play: async () => {
    await openTab(/Network Routes/)();
    await clickRole("button", /Add Route/);
    await clickText("Existing Network");
    await dialog();
  },
};

export const RemoteJobDropdown: Story = {
  play: async () => {
    await openTab(/Remote Jobs/)();
    await clickRole("button", /Run Remote Job/);
    await menu();
  },
};

export const DebugBundleModal: Story = {
  play: async () => {
    await openTab(/Remote Jobs/)();
    await clickRole("button", /Run Remote Job/);
    await clickRole("menuitem", /Debug Bundle/);
    await dialog();
  },
};

export const RemoteJobOfflinePeer: Story = {
  parameters: peer("peer-offline-laptop"),
  play: async () => {
    await openTab(/Remote Jobs/)();
    await clickRole("button", /Run Remote Job/);
    await menu();
  },
};
