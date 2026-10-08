import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { screen } from "storybook/test";
import PeersPage from "@/app/(dashboard)/peers/page";
import type { Announcement } from "@/contexts/AnnouncementProvider";
import DashboardLayout from "@/layouts/DashboardLayout";
import { settle } from "@/storybook/wait";

const ANNOUNCEMENTS_URL =
  "GET https://raw.githubusercontent.com/netbirdio/dashboard/main/announcements.json";

/* The banner shows the first open announcement from the remote
   announcements.json, so each story serves exactly one. */
const withAnnouncement = (announcement: Partial<Announcement>) => ({
  api: {
    [ANNOUNCEMENTS_URL]: [
      {
        tag: "",
        closeable: true,
        isCloudOnly: false,
        variant: "default",
        ...announcement,
      },
    ],
  },
});

const meta: Meta = {
  title: "Components/AnnouncementBanner",
  parameters: { nextjs: { navigation: { pathname: "/peers" } } },
  render: () => (
    <DashboardLayout>
      <PeersPage />
    </DashboardLayout>
  ),
  play: async ({ parameters }) => {
    const [announcement] = parameters.api[ANNOUNCEMENTS_URL];
    await screen.findByText(announcement.text, {}, { timeout: 5000 });
    // The close button is a plain div around the X icon; the capture-hover
    // tag hovers whatever carries data-capture.
    document
      .querySelector("svg.lucide-x")
      ?.parentElement?.setAttribute("data-capture", "");
    await settle(500);
  },
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  tags: ["capture-hover"],
  parameters: withAnnouncement({
    tag: "New",
    text: "NetBird v0.60 adds remote jobs and a redesigned control center.",
    link: "https://netbird.io/blog",
    linkText: "Read the release notes",
    isExternal: true,
  }),
};

export const DefaultWithoutTagOrLink: Story = {
  parameters: withAnnouncement({
    text: "Scheduled maintenance on October 12 between 02:00 and 03:00 UTC.",
  }),
};

export const Important: Story = {
  tags: ["capture-hover"],
  parameters: withAnnouncement({
    variant: "important",
    tag: "Action required",
    text: "Your trial ends in 3 days. Upgrade to keep your peers connected.",
    link: "/plans",
    linkText: "View plans",
  }),
};

/* Matches what NETBIRD_ANNOUNCEMENT produces: important, untagged, not closeable. */
export const ImportantNotCloseable: Story = {
  parameters: withAnnouncement({
    variant: "important",
    closeable: false,
    text: "Staging dashboard: connected to management at mgmt-staging.netbird.io",
  }),
};

export const LongText: Story = {
  parameters: withAnnouncement({
    tag: "Update",
    text:
      "We are rolling out a new peer approval flow across all regions over the next two weeks. " +
      "Peers that were already approved stay approved, and no action is needed unless your " +
      "organization relies on the legacy approval API.",
    link: "https://docs.netbird.io",
    linkText: "Learn more",
  }),
};
