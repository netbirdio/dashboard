import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import CustomDomainsPage from "@/app/(dashboard)/reverse-proxy/custom-domains/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  click,
  clickRole,
  clickTextIn,
  dialog,
  findText,
  openFilters,
  popover,
  row,
  settle,
  type,
} from "@/storybook/platform";

const meta: Meta = {
  title: "Pages/Platform/Reverse Proxy/Custom Domains",
  parameters: {
    nextjs: { navigation: { pathname: "/reverse-proxy/custom-domains" } },
  },
  render: () => (
    <DashboardLayout>
      <CustomDomainsPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const loaded = async () => {
  await row("dom-acme");
  await settle();
};

export const List: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await loaded();
    (await row("dom-status")).setAttribute("data-capture", "");
  },
};

/* The pending badge explains itself in a tooltip; the real-pointer hover shot shows it. */
export const PendingTooltip: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await loaded();
    const badge = Array.from(
      (await row("dom-pending")).querySelectorAll("div, span"),
    ).find((el) => el.textContent === "Pending Verification");
    badge?.setAttribute("data-capture", "");
  },
};

export const Empty: Story = {
  parameters: { api: { "GET /reverse-proxies/domains": [] } },
  play: async () => {
    await findText(/Add Domain/);
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

async function openAdd() {
  await loaded();
  await clickRole("button", /Add Domain/);
  return dialog();
}

export const AddDomain: Story = {
  play: async () => {
    await openAdd();
    await settle();
  },
};

export const AddDomainInvalid: Story = {
  play: async () => {
    const modal = await openAdd();
    await type(
      modal.querySelector("[data-testid=custom-domain-input] input, input"),
      "invalid domain",
    );
    await settle();
  },
};

export const AddDomainClusterOpen: Story = {
  play: async () => {
    const modal = await openAdd();
    await type(
      modal.querySelector("[data-testid=custom-domain-input] input, input"),
      "portal.acme-corp.com",
    );
    await click(
      modal.querySelector(
        "[data-testid=custom-domain-cluster-selector] button",
      ),
    );
    await popover();
    await settle();
  },
};

export const AddDomainFilled: Story = {
  play: async () => {
    await AddDomainClusterOpen.play!({} as never);
    await clickTextIn(popover(), /eu\.proxy\.netbird\.io/);
    await settle();
  },
};

export const VerifyDomain: Story = {
  play: async () => {
    await loaded();
    const verify = Array.from(
      (await row("dom-pending")).querySelectorAll("button"),
    ).find((b) => /Verify Domain/.test(b.textContent ?? ""));
    await click(verify);
    await dialog();
    await settle();
  },
};
