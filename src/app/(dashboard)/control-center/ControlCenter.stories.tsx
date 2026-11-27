import type { Meta } from "@storybook/nextjs-vite";
import { fireEvent, screen, userEvent } from "storybook/test";
import ControlCenterPage from "@/app/(dashboard)/control-center/page";
import {
  click,
  inLayout,
  nav,
  resetStorage,
  type Story,
  until,
} from "@/storybook/core";
import { settle } from "@/storybook/wait";

const meta: Meta = {
  title: "Pages/Core/ControlCenter",
  parameters: nav("/control-center"),
  beforeEach: resetStorage,
  render: inLayout(ControlCenterPage),
};
export default meta;

const byTestId = (id: string) =>
  screen.findByTestId(id, {}, { timeout: 10_000 });

/* The canvas fits its viewport after the nodes are measured; wait until
   React Flow has rendered nodes and the pre-fit hiding class is gone. */
const canvasReady = async () => {
  await until(() => {
    const nodes = document.querySelectorAll(".react-flow__node");
    if (nodes.length === 0) throw new Error("no nodes yet");
    if (document.querySelector(".cc-prefit"))
      throw new Error("viewport not fitted yet");
  });
  // Camera easing can outlast the pre-fit class; let the transform settle
  // before a story samples node coordinates for a panel or context menu.
  await settle(1500);
};

/* The draft toolbar slides in under the pointer; park the pointer and give
   the canvas a moment so the shot never catches a tool in hover state. */
const draftReady = async () => {
  await byTestId("cc-toolbar-add");
  await canvasReady();
  await userEvent.pointer({ coords: { clientX: 1, clientY: 1 } });
  await settle(1000);
};

const liveReady = async () => {
  await byTestId("cc-flow-peers");
  await canvasReady();
};

const view = (tab: string): Story => ({
  parameters: nav("/control-center", { tab }),
  play: liveReady,
});

export const PeersView = view("peers");
export const UsersView = view("users");
export const GroupsView = view("groups");
export const NetworksView = view("networks");
export const CloudPeersView: Story = { ...view("peers"), tags: ["cloud"] };

export const DraftModeChooser: Story = {
  play: async () => {
    await liveReady();
    await click(byTestId("cc-mode-draft"));
    await byTestId("cc-draft-use-current-option");
  },
};

export const DraftMode: Story = {
  play: async () => {
    await liveReady();
    await click(byTestId("cc-mode-draft"));
    await click(byTestId("cc-draft-use-current-option"));
    await draftReady();
  },
};

export const DraftAddMenu: Story = {
  play: async () => {
    await liveReady();
    await click(byTestId("cc-mode-draft"));
    await click(byTestId("cc-draft-use-current-option"));
    await draftReady();
    await click(byTestId("cc-toolbar-add"));
    await screen.findByPlaceholderText(
      /Search components/,
      {},
      { timeout: 10_000 },
    );
  },
};

export const NodeContextMenu: Story = {
  play: async () => {
    await liveReady();
    const node = document.querySelectorAll(".react-flow__node")[0];
    const rect = node.getBoundingClientRect();
    fireEvent.contextMenu(node.firstElementChild ?? node, {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    });
    await byTestId("cc-node-context-menu");
  },
};

/* An exit-node policy's destination: the exit node card, with the flags of
   the countries its traffic exits in. Hovering the flags lists the cities. */
export const ExitNodeLocations: Story = {
  play: async () => {
    await liveReady();
    const card = await byTestId("cc-exit-node");
    const flags = card.querySelector("[aria-label]");
    await userEvent.hover(flags ?? card);
    // The tooltip also renders a hidden copy for screen readers.
    await screen.findAllByText(/Traffic exits/, {}, { timeout: 10_000 });
  },
};

export const ExitNodeContextMenu: Story = {
  play: async () => {
    await liveReady();
    const card = await byTestId("cc-exit-node");
    const rect = card.getBoundingClientRect();
    fireEvent.contextMenu(card, {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    });
    await byTestId("cc-node-context-menu");
    await screen.findByText("Edit Exit Node");
  },
};

/* Draft keeps an exit-node policy's destination: the exit node card. */
const enterDraft = async () => {
  await liveReady();
  await click(byTestId("cc-mode-draft"));
  await click(byTestId("cc-draft-use-current-option"));
  await draftReady();
};

export const DraftExitNode: Story = {
  play: async () => {
    await enterDraft();
    await byTestId("cc-exit-node");
  },
};

export const DraftExitNodesPanel: Story = {
  play: async () => {
    await enterDraft();
    await click(byTestId("cc-toolbar-add"));
    await click(byTestId("cc-category-exit-nodes"));
    await byTestId("cc-template-exit-node");
  },
};

export const DraftExitNodeContextMenu: Story = {
  play: async () => {
    await enterDraft();
    const card = await byTestId("cc-exit-node");
    const rect = card.getBoundingClientRect();
    fireEvent.contextMenu(card, {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    });
    await byTestId("cc-node-context-menu");
    await screen.findByText("Disable");
  },
};
