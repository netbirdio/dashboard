import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { peerConnectionEvents } from "../../../.storybook/mocks/fixtures/peer-connections";
import { PeerConnectionHistoryContent } from "./PeerConnectionHistory";

const meta = {
  title: "Peers/Connection History",
  component: PeerConnectionHistoryContent,
  args: { events: peerConnectionEvents, onRefresh: fn() },
} satisfies Meta<typeof PeerConnectionHistoryContent>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {};
export const HelpOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.hover(
      canvas.getByRole("button", { name: "About connection history" }),
    );
    const tooltip = await within(document.body).findByRole("tooltip");
    await waitFor(() => expect(tooltip).toBeVisible());
  },
};
export const SearchBySourceIP: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByPlaceholderText("Search events, source IPs or locations..."),
      "198.51.100.12",
    );
    await expect(canvas.getByText("198.51.100.12")).toBeVisible();
    await waitFor(() =>
      expect(canvas.queryByText("203.0.113.24")).not.toBeInTheDocument(),
    );
  },
};
export const Empty: Story = { args: { events: [] } };
export const Loading: Story = { args: { events: [], isLoading: true } };
export const Error: Story = {
  args: { events: [], hasError: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Retry" }));
    await expect(args.onRefresh).toHaveBeenCalled();
  },
};
