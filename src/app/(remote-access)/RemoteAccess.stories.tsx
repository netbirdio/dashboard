import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import RemoteAccessLayout from "@/app/(remote-access)/layout";
import RDPPage from "@/app/(remote-access)/peer/rdp/page";
import SSHPage from "@/app/(remote-access)/peer/ssh/page";
import { PEER } from "@/storybook/fixtures";
import { findText, settle } from "@/storybook/platform";

/* The browser SSH and RDP clients need the NetBird WASM client, which the
   stories do not load; only the states before and without it are captured. */
const meta: Meta = { title: "Pages/Platform/Remote Access" };
export default meta;
type Story = StoryObj;

const ssh = (query: Record<string, string>) => ({
  nextjs: { navigation: { pathname: "/peer/ssh", query } },
});
const rdp = (query: Record<string, string>) => ({
  nextjs: { navigation: { pathname: "/peer/rdp", query } },
});

const sshPage = () => (
  <RemoteAccessLayout>
    <SSHPage />
  </RemoteAccessLayout>
);
const rdpPage = () => (
  <RemoteAccessLayout>
    <RDPPage />
  </RemoteAccessLayout>
);

export const SSHStarting: Story = {
  parameters: ssh({}),
  render: sshPage,
  play: async () => {
    await settle(800);
  },
};

export const SSHPeerNotFound: Story = {
  parameters: {
    ...ssh({ id: "peer-deleted", user: "root", port: "22" }),
    api: {
      "GET /peers/:id": () => {
        throw new Error("not found");
      },
    },
  },
  render: sshPage,
  play: async () => {
    await findText(/may have been deleted/);
    await settle();
  },
};

export const RDPStarting: Story = {
  parameters: rdp({}),
  render: rdpPage,
  play: async () => {
    await settle(800);
  },
};

/* The credentials prompt opens before the client connects. */
export const RDPCredentials: Story = {
  parameters: rdp({ id: PEER.windows }),
  render: rdpPage,
  play: async () => {
    await findText(/password/i);
    await settle(1500);
  },
};

/* Without a WASM build to load, the client fails to start and the page says so. */
export const SSHClientError: Story = {
  parameters: ssh({ id: PEER.webServer, user: "root", port: "22" }),
  render: sshPage,
  play: async () => {
    await findText(/WebAssembly|WASM|Failed/);
    await settle();
  },
};
