import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ReverseProxyRedirectPage from "@/app/(dashboard)/reverse-proxy/page";
import ServicesPage from "@/app/(dashboard)/reverse-proxy/services/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  click,
  clickRole,
  clickTestId,
  clickText,
  clickTextIn,
  dialog,
  dialogCount,
  findText,
  openFilters,
  popover,
  row,
  settle,
  type,
  waitForSelector,
} from "@/storybook/platform";

const meta: Meta = {
  title: "Pages/Platform/Reverse Proxy/Services",
  parameters: {
    nextjs: { navigation: { pathname: "/reverse-proxy/services" } },
  },
  render: () => (
    <DashboardLayout>
      <ServicesPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const loaded = async () => {
  await row("svc-grafana");
  await settle();
};

async function openRowMenu(id: string) {
  await loaded();
  await click((await row(id)).querySelector("[data-testid=service-actions]"));
  await popover();
}

async function openEdit(id: string) {
  await openRowMenu(id);
  await clickTestId("edit-service");
  await dialog();
  await settle();
}

async function openTab(
  tab: "targets" | "auth" | "access-control" | "settings",
) {
  await clickTestId(`proxy-tab-${tab}`);
  await settle();
}

export const Overview: Story = {
  parameters: { nextjs: { navigation: { pathname: "/reverse-proxy" } } },
  render: () => (
    <DashboardLayout>
      <ReverseProxyRedirectPage />
    </DashboardLayout>
  ),
};

export const List: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await loaded();
    (await row("svc-wiki")).setAttribute("data-capture", "");
  },
};

export const Empty: Story = {
  parameters: { api: { "GET /reverse-proxies/services": [] } },
  play: async () => {
    await findText(/Add Service/);
    await settle();
  },
};

export const ExpandedRow: Story = {
  play: async () => {
    await loaded();
    // The domain cell copies to the clipboard on click, so the row is expanded from its type cell.
    const type = (await row("svc-grafana")).querySelectorAll("td")[1];
    await click(type);
    await waitForSelector('[data-row-id="svc-grafana-expanded-row"]');
    await settle();
  },
};

export const FiltersOpen: Story = {
  play: async () => {
    await loaded();
    await openFilters();
    await popover();
    await settle();
  },
};

export const RowActions: Story = { play: () => openRowMenu("svc-postgres") };

export const AddService: Story = {
  play: async () => {
    await loaded();
    await clickTestId("add-service");
    await dialog();
    await settle();
  },
};

export const AddServiceDomainSelector: Story = {
  play: async () => {
    await AddService.play!({} as never);
    await clickTestId("proxy-domain-selector");
    await popover();
    await settle();
  },
};

/* Only the shared EU cluster supports custom ports, which unlocks the TCP/UDP/TLS modes. */
async function addServiceOnSharedCluster() {
  await AddServiceDomainSelector.play!({} as never);
  await clickTextIn(popover(), /^\.?eu\.proxy\.netbird\.io$/);
  await type(
    (await dialog()).querySelector("[data-testid=proxy-subdomain-input]"),
    "myapp",
  );
  await settle();
}

export const AddServiceSharedCluster: Story = {
  play: addServiceOnSharedCluster,
};

export const AddServiceModeSelector: Story = {
  play: async () => {
    await addServiceOnSharedCluster();
    await clickTestId("service-mode-select-button");
    await waitForSelector("[data-testid=service-mode-selection]");
    await settle();
  },
};

const modeStory = (mode: "tcp" | "udp" | "tls"): Story => ({
  play: async () => {
    await AddServiceModeSelector.play!({} as never);
    await clickTestId(`service-mode-option-${mode}`);
    await settle();
  },
});
export const AddServiceTCP = modeStory("tcp");
export const AddServiceUDP = modeStory("udp");
export const AddServiceTLS = modeStory("tls");

export const AddTarget: Story = {
  play: async () => {
    await addServiceOnSharedCluster();
    await clickTestId("add-target");
    await dialogCount(2);
    await settle();
  },
};

async function openTargetSelector() {
  await AddTarget.play!({} as never);
  await clickText(/Select a peer, resource, or proxy cluster/);
  await popover();
  await settle();
}

export const AddTargetSelectorPeers: Story = { play: openTargetSelector };

export const AddTargetSelectorResources: Story = {
  play: async () => {
    await openTargetSelector();
    await clickRole("tab", /Resources/);
    await settle();
  },
};

export const AddTargetSelectorClusters: Story = {
  play: async () => {
    await openTargetSelector();
    await clickRole("tab", /Proxy Clusters/);
    await settle();
  },
};

export const AddTargetPeerOptionalSettings: Story = {
  play: async () => {
    await openTargetSelector();
    await clickTextIn(popover(), "olivias-macbook-pro");
    await settle();
    await clickTestId("target-optional-settings");
    await settle(500);
  },
};

export const EditTargets: Story = { play: () => openEdit("svc-grafana") };

export const EditTargetActions: Story = {
  play: async () => {
    await openEdit("svc-grafana");
    await clickTestId("target-row-actions", 1);
    await popover();
    await settle();
  },
};

export const EditTarget: Story = {
  play: async () => {
    await EditTargetActions.play!({} as never);
    await clickTestId("edit-target");
    await findText("Edit Target");
    await clickTestId("target-optional-settings");
    await settle(500);
  },
};

export const EditAuth: Story = {
  play: async () => {
    await openEdit("svc-grafana");
    await openTab("auth");
  },
};

const authStory = (card: string, service = "svc-grafana"): Story => ({
  play: async () => {
    await openEdit(service);
    await openTab("auth");
    await clickTestId(`auth-${card}-card`);
    await dialogCount(2);
    await settle();
  },
});

export const EditAuthSSO = authStory("sso");
export const EditAuthPassword = authStory("password", "svc-wiki");
export const EditAuthPin = authStory("pin", "svc-wiki");
export const EditAuthHeader = authStory("header", "svc-long");
export const EditAuthNetBirdOnly = authStory("netbird-only");

export const EditAccessControl: Story = {
  play: async () => {
    await openEdit("svc-grafana");
    await openTab("access-control");
  },
};

export const EditAccessControlRuleType: Story = {
  play: async () => {
    await EditAccessControl.play!({} as never);
    await clickTestId("add-access-rule");
    await settle();
    const types = (await dialog()).querySelectorAll(
      "[data-testid=access-rule-type]",
    );
    await click(types[types.length - 1]?.querySelector("button"));
    await popover();
    await settle();
  },
};

export const EditSettings: Story = {
  play: async () => {
    await openEdit("svc-grafana");
    await openTab("settings");
  },
};

const serviceTabs = (id: string) => ({
  Targets: { play: () => openEdit(id) } as Story,
  AccessControl: {
    play: async () => {
      await openEdit(id);
      await openTab("access-control");
    },
  } as Story,
  Settings: {
    play: async () => {
      await openEdit(id);
      await openTab("settings");
    },
  } as Story,
});

const tcp = serviceTabs("svc-postgres");
export const EditTCPService = tcp.Targets;
export const EditTCPAccessControl = tcp.AccessControl;
export const EditTCPSettings = tcp.Settings;

const udp = serviceTabs("svc-voip");
export const EditUDPService = udp.Targets;
export const EditUDPSettings = udp.Settings;

const tls = serviceTabs("svc-tls");
export const EditTLSService = tls.Targets;

const priv = serviceTabs("svc-private");
export const EditPrivateService = priv.Targets;
export const EditPrivateAuth: Story = {
  play: async () => {
    await openEdit("svc-private");
    await openTab("auth");
  },
};
export const EditPrivateAccessControl = priv.AccessControl;

export const EditClusterTargetService: Story = {
  play: () => openEdit("svc-status"),
};
