import Badge from "@components/Badge";
import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { DataTableMultiSelectPopup } from "@components/table/DataTableMultiSelectPopup";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import {
  CheckboxListPicker,
  formatCheckboxChip,
} from "@components/table/filters/CheckboxListPicker";
import { GroupsPicker } from "@components/table/filters/GroupsPicker";
import { RadioPicker } from "@components/table/filters/RadioPicker";
import {
  formatStatusChip,
  StatusPicker,
} from "@components/table/filters/StatusPicker";
import { TextInputPicker } from "@components/table/filters/TextInputPicker";
import { UsersPicker } from "@components/table/filters/UsersPicker";
import {
  TableFilterChips,
  type TableFilterDef,
  TableFiltersButton,
} from "@components/table/TableFilters";
import NoResults from "@components/ui/NoResults";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { userEvent } from "storybook/test";
import {
  clickOpen,
  Controlled,
  padded,
  pauseSvgAnimations,
  Row,
  Stack,
  waitForMotion,
} from "@/storybook/components";
import { groups, users } from "@/storybook/fixtures";
import { settle } from "@/storybook/wait";

type PeerRow = {
  id: string;
  name: string;
  ip: string;
  os: string;
  connected: boolean;
  groups: number;
};

const rows: PeerRow[] = [
  {
    id: "1",
    name: "macbook-pro-olivia",
    ip: "100.92.14.3",
    os: "darwin",
    connected: true,
    groups: 3,
  },
  {
    id: "2",
    name: "web-server-eu-central-1-with-a-long-hostname",
    ip: "100.92.200.17",
    os: "linux",
    connected: false,
    groups: 1,
  },
  {
    id: "3",
    name: "k8s-node-pool-a-7f9c",
    ip: "100.92.31.90",
    os: "linux",
    connected: true,
    groups: 5,
  },
  {
    id: "4",
    name: "router-berlin",
    ip: "100.92.8.1",
    os: "linux",
    connected: true,
    groups: 2,
  },
  {
    id: "5",
    name: "win-workstation-dana",
    ip: "100.92.14.21",
    os: "windows",
    connected: true,
    groups: 2,
  },
  {
    id: "6",
    name: "iphone-olivia",
    ip: "100.92.14.55",
    os: "ios",
    connected: false,
    groups: 2,
  },
  {
    id: "7",
    name: "pixel-9",
    ip: "100.92.14.61",
    os: "android",
    connected: true,
    groups: 1,
  },
];

const columns: ColumnDef<PeerRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        variant={"tableCell"}
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomePageRowsSelected()
            ? "indeterminate"
            : false
        }
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        variant={"tableCell"}
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
      />
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableHeader column={column} tooltip={"The peer name"}>
        Name
      </DataTableHeader>
    ),
    cell: ({ row }) => (
      <span className={"font-medium text-nb-gray-100"}>
        {row.original.name}
      </span>
    ),
  },
  {
    accessorKey: "ip",
    header: ({ column }) => (
      <DataTableHeader column={column}>Address</DataTableHeader>
    ),
  },
  {
    accessorKey: "connected",
    filterFn: "equals",
    header: ({ column }) => (
      <DataTableHeader column={column}>Status</DataTableHeader>
    ),
    cell: ({ row }) => (
      <Badge variant={row.original.connected ? "green" : "gray"} size={"xs"}>
        {row.original.connected ? "Online" : "Offline"}
      </Badge>
    ),
  },
  {
    accessorKey: "os",
    filterFn: "arrIncludesSome",
    header: ({ column }) => (
      <DataTableHeader column={column}>OS</DataTableHeader>
    ),
  },
  {
    accessorKey: "groups",
    header: ({ column }) => (
      <DataTableHeader column={column} sorting={false}>
        Groups
      </DataTableHeader>
    ),
  },
];

const filterDefs = [
  {
    id: "connected",
    label: "Status",
    renderPicker: (p) => (
      <StatusPicker {...(p as Parameters<typeof StatusPicker>[0])} />
    ),
    formatChip: (v) => formatStatusChip(v as boolean | undefined),
  },
  {
    id: "os",
    label: "Operating system",
    renderPicker: (p) => (
      <CheckboxListPicker
        {...(p as Omit<
          Parameters<typeof CheckboxListPicker<string>>[0],
          "options"
        >)}
        options={[
          { value: "linux", label: "Linux" },
          { value: "darwin", label: "macOS" },
          { value: "windows", label: "Windows" },
          { value: "ios", label: "iOS" },
          { value: "android", label: "Android" },
        ]}
      />
    ),
    formatChip: (v) =>
      formatCheckboxChip(v as string[] | undefined, [], "OSes"),
  },
] as TableFilterDef[];

function PeersTable({
  data = rows,
  pageSize = 5,
  selected = { 1: true },
  isLoading = false,
  withFilters = false,
}: {
  data?: PeerRow[];
  pageSize?: number;
  selected?: Record<string, boolean>;
  isLoading?: boolean;
  withFilters?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [rowSelection, setRowSelection] = useState(selected);
  return (
    <DataTable
      text={"Peers"}
      columns={columns}
      data={data}
      sorting={sorting}
      setSorting={setSorting}
      rowSelection={rowSelection}
      setRowSelection={setRowSelection}
      keepStateInLocalStorage={false}
      initialPageSize={pageSize}
      isLoading={isLoading}
      searchPlaceholder={"Search by name or IP..."}
      showResetFilterButton={false}
      initialFilters={
        withFilters ? [{ id: "connected", value: true }] : undefined
      }
      aboveTable={
        withFilters
          ? (table) => <TableFilterChips table={table} filters={filterDefs} />
          : undefined
      }
      getStartedCard={
        <NoResults
          title={"No peers yet"}
          description={"Add your first peer to get started."}
        />
      }
    >
      {(table) => (
        <>
          {withFilters && (
            <TableFiltersButton table={table} filters={filterDefs} />
          )}
          <DataTableRowsPerPage table={table} disabled={data.length === 0} />
          <DataTableRefreshButton onClick={() => {}} isDisabled={false} />
        </>
      )}
    </DataTable>
  );
}

const meta: Meta = {
  title: "Components/DataTable",
  parameters: { nextjs: { navigation: { pathname: "/peers" } } },
  play: async () => {
    await waitForMotion();
  },
};
export default meta;

export const Default: StoryObj = {
  tags: ["capture-hover"],
  render: () => <PeersTable />,
  play: async ({ canvasElement }) => {
    canvasElement
      .querySelectorAll("tbody tr")[2]
      ?.setAttribute("data-capture", "");
    await waitForMotion();
  },
};

export const RowsSelected: StoryObj = {
  render: () => <PeersTable />,
  play: async ({ canvasElement }) => {
    await waitForMotion();
    const boxes = canvasElement.querySelectorAll<HTMLElement>(
      "tbody button[role=checkbox]",
    );
    await userEvent.click(boxes[1]);
    await userEvent.click(boxes[3]);
  },
};

export const SearchFocus: StoryObj = {
  tags: ["capture-focus"],
  render: () => <PeersTable />,
  play: async ({ canvasElement }) => {
    canvasElement.querySelector("input")?.setAttribute("data-capture", "");
    await waitForMotion();
  },
};

export const WithFilters: StoryObj = {
  render: () => <PeersTable withFilters />,
};

export const FilterPopoverOpen: StoryObj = {
  render: () => <PeersTable withFilters />,
  play: async (ctx) => {
    await waitForMotion();
    await clickOpen(/^filters/i)(ctx);
  },
};

export const RowsPerPageOpen: StoryObj = {
  render: () => <PeersTable />,
  play: async (ctx) => {
    await waitForMotion();
    await clickOpen("[data-testid=rows-per-page]")(ctx);
  },
};

export const Loading: StoryObj = {
  render: () => <PeersTable data={[]} isLoading />,
  play: async (ctx) => {
    await waitForMotion();
    pauseSvgAnimations(ctx);
  },
};

export const Empty: StoryObj = {
  render: () => <PeersTable data={[]} />,
};

export const MultiSelectPopup: StoryObj = {
  render: () => (
    <div
      className={"relative h-[300px] overflow-hidden"}
      style={{ transform: "translateZ(0)" }}
    >
      <div className={"absolute bottom-10 w-full"}>
        <DataTableMultiSelectPopup
          selectedItems={[rows[0], rows[1]]}
          rightSide={
            <Button variant={"danger-outline"} size={"xs"}>
              <Trash2 size={14} />
              Delete
            </Button>
          }
        />
      </div>
    </div>
  ),
  // The popup slides in with framer-motion; wait until it has settled.
  play: async () => {
    await settle(800);
  },
};

export const FilterPickers: StoryObj = {
  decorators: [padded],
  render: () => (
    <div className={"grid grid-cols-3 gap-6 w-[1000px] items-start"}>
      <Picker label={"status"}>
        <Controlled initial={true as boolean | undefined}>
          {(v, set) => (
            <StatusPicker value={v} onChange={set} close={() => {}} />
          )}
        </Controlled>
      </Picker>
      <Picker label={"radio"}>
        <Controlled initial={"admin" as string | undefined}>
          {(v, set) => (
            <RadioPicker
              value={v}
              onChange={set}
              close={() => {}}
              options={[
                { value: undefined, label: "All" },
                { value: "admin", label: "Admin", dotClass: "bg-netbird" },
                { value: "user", label: "User", dotClass: "bg-sky-500" },
              ]}
            />
          )}
        </Controlled>
      </Picker>
      <Picker label={"checkbox list"}>
        <Controlled initial={["linux"] as string[] | undefined}>
          {(v, set) => (
            <CheckboxListPicker
              value={v}
              onChange={set}
              close={() => {}}
              options={[
                { value: "linux", label: "Linux" },
                { value: "darwin", label: "macOS" },
                { value: "windows", label: "Windows" },
              ]}
            />
          )}
        </Controlled>
      </Picker>
      <Picker label={"text input"}>
        <TextInputPicker
          value={"443"}
          onChange={() => {}}
          close={() => {}}
          placeholder={"Port"}
        />
      </Picker>
      <Picker label={"groups"}>
        <GroupsPicker
          value={["Developers"]}
          onChange={() => {}}
          close={() => {}}
          groups={groups as never}
        />
      </Picker>
      <Picker label={"users"}>
        <UsersPicker
          value={users[0].id}
          onChange={() => {}}
          close={() => {}}
          options={users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email ?? "",
          }))}
        />
      </Picker>
    </div>
  ),
};

function Picker({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Stack>
      <Row label={label}>
        <div
          className={
            "w-[260px] rounded-md border border-nb-gray-800 bg-nb-gray-920 p-2"
          }
        >
          {children}
        </div>
      </Row>
    </Stack>
  );
}
