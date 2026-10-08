import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import LogsPage from "@/app/(dashboard)/reverse-proxy/logs/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  click,
  clickText,
  findText,
  openFilters,
  popover,
  settle,
} from "@/storybook/platform";

const meta: Meta = {
  title: "Pages/Platform/Reverse Proxy/Logs",
  parameters: { nextjs: { navigation: { pathname: "/reverse-proxy/logs" } } },
  render: () => (
    <DashboardLayout>
      <LogsPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const loaded = async () => {
  await findText("/d/home");
  await settle();
};

export const List: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await loaded();
    (await findText(/\/api\/ds\/query/))
      .closest("tr")
      ?.setAttribute("data-capture", "");
  },
};

export const Empty: Story = {
  parameters: {
    api: {
      "GET /events/proxy": {
        data: [],
        page: 1,
        page_size: 25,
        total_pages: 0,
        total_records: 0,
      },
    },
  },
  play: async () => {
    await findText("No Proxy Events Yet");
    await settle();
  },
};

/* One row with request metadata and one without, to show both expanded layouts. */
export const ExpandedRows: Story = {
  play: async () => {
    await loaded();
    await click((await findText("/d/home")).closest("tr"));
    await settle();
    await click((await findText("/login")).closest("tr"));
    await settle(500);
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

const filterStory = (label: string): Story => ({
  play: async () => {
    await FiltersOpen.play!({} as never);
    await clickText(label);
    await settle();
  },
});
export const FilterStatus = filterStory("Status");
export const FilterMethod = filterStory("Method");
export const FilterUser = filterStory("User");
export const FilterLocation = filterStory("Location / IP");

export const DatePickerOpen: Story = {
  play: async () => {
    await loaded();
    const trigger =
      document.querySelector("#date") ??
      (await findText(/\d{4}|Pick a date|Last/)).closest("button");
    await click(trigger);
    await popover();
    await settle();
  },
};
