import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ClustersPage from "@/app/(dashboard)/reverse-proxy/clusters/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  clickRole,
  dialog,
  findText,
  openFilters,
  popover,
  settle,
  type,
} from "@/storybook/platform";

const meta: Meta = {
  title: "Pages/Platform/Reverse Proxy/Clusters",
  parameters: {
    nextjs: { navigation: { pathname: "/reverse-proxy/clusters" } },
  },
  render: () => (
    <DashboardLayout>
      <ClustersPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const loaded = async () => {
  await findText("edge.acme-corp.net");
  await settle();
};

export const List: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await loaded();
    (await findText("proxy.acme-corp.com"))
      .closest("tr")
      ?.setAttribute("data-capture", "");
  },
};

export const Empty: Story = {
  parameters: { api: { "GET /reverse-proxies/clusters": [] } },
  play: async () => {
    await findText(/Setup Self-Hosted Cluster/);
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

async function openSetup() {
  await loaded();
  await clickRole("button", /Setup Self-Hosted Cluster/);
  return dialog();
}

export const SetupDomain: Story = {
  play: async () => {
    await openSetup();
    await settle();
  },
};

export const SetupDomainInvalid: Story = {
  play: async () => {
    const modal = await openSetup();
    await type(modal.querySelector("input"), "not a domain");
    await settle();
  },
};

async function withDomain() {
  const modal = await openSetup();
  await type(modal.querySelector("input"), "proxy.example.com");
  await settle();
}

export const SetupMethodOpen: Story = {
  play: async () => {
    await withDomain();
    await clickRole("button", /^Docker/);
    await popover();
    await settle();
  },
};

export const SetupDNS: Story = {
  play: async () => {
    await withDomain();
    await clickRole("tab", /DNS Records/);
    await settle();
  },
};

const installStory = (method?: string): Story => ({
  play: async () => {
    await withDomain();
    if (method) {
      await clickRole("button", /^Docker/);
      await popover();
      await clickRole("option", new RegExp(`^${method}$`)).catch(async () =>
        (await findText(method)).click(),
      );
      await settle();
    }
    await clickRole("tab", /Run the Proxy|Deploy/);
    // Cloud deployments render a launch link instead of the token snippet.
    await findText(
      /NB_PROXY_TOKEN|nbp_RegressionTestToken|Hetzner|DigitalOcean/,
    );
    await settle(500);
  },
});

export const SetupInstallDocker = installStory();
export const SetupInstallCompose = installStory("Docker Compose");
export const SetupInstallKubernetes = installStory("Kubernetes");
export const SetupInstallHetzner = installStory("Hetzner Cloud");
export const SetupInstallDigitalOcean = installStory("DigitalOcean");
export const SetupInstallAWS = installStory("AWS CloudFormation");
