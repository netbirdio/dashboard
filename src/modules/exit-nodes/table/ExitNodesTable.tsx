import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
import {
  ACTIONS_COLUMN_ID,
  ENABLED_COLUMN_ID,
  fadeDisabledRowCells,
} from "@components/table/disabledRowCells";
import { ENABLED_COLUMN_CLASS } from "@components/table/enabledColumnClass";
import {
  formatRadioChip,
  RadioOption,
  RadioPicker,
} from "@components/table/filters/RadioPicker";
import {
  TableFilterChips,
  TableFilterDef,
  TableFiltersButton,
} from "@components/table/TableFilters";
import GetStartedTest from "@components/ui/GetStartedTest";
import { IconDirectionSign } from "@tabler/icons-react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ExitNode } from "@/interfaces/ExitNode";
import {
  EXIT_NODES_DOCS_URL,
  getExitNodeLocations,
  getExitNodePolicies,
  getExitNodeSearchText,
  getHighAvailability,
} from "@/modules/exit-nodes/exitNodeHelpers";
import { useExitNodes } from "@/modules/exit-nodes/ExitNodesProvider";
import ExitNodeActionCell from "@/modules/exit-nodes/table/ExitNodeActionCell";
import ExitNodeActiveCell from "@/modules/exit-nodes/table/ExitNodeActiveCell";
import ExitNodeAutoApplyCell from "@/modules/exit-nodes/table/ExitNodeAutoApplyCell";
import ExitNodeHighAvailabilityCell from "@/modules/exit-nodes/table/ExitNodeHighAvailabilityCell";
import ExitNodeLocationCell from "@/modules/exit-nodes/table/ExitNodeLocationCell";
import ExitNodeNameCell from "@/modules/exit-nodes/table/ExitNodeNameCell";
import ExitNodePeersTable from "@/modules/exit-nodes/table/ExitNodePeersTable";
import ExitNodePolicyCell from "@/modules/exit-nodes/table/ExitNodePolicyCell";
import { useExitNodePermissions } from "@/modules/exit-nodes/useExitNodePermissions";

/** An exit node with the fields its columns sort, filter and search by. */
type ExitNodeRow = ExitNode & {
  search: string;
  location: string;
  active_peer_count: number;
  policy_count: number;
};

// Module-level so cells keep their identity when peers or policies reload;
// recreated column definitions would remount every cell and close its menus.
const ExitNodeTableColumns: ColumnDef<ExitNodeRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableHeader column={column}>Name</DataTableHeader>
    ),
    sortingFn: "text",
    cell: ({ row }) => <ExitNodeNameCell exitNode={row.original} />,
  },
  {
    accessorKey: "search",
  },
  {
    id: ENABLED_COLUMN_ID,
    accessorKey: "enabled",
    enableSorting: false,
    meta: { className: ENABLED_COLUMN_CLASS.xl, fit: true },
    header: ({ column }) => (
      <DataTableHeader column={column} sorting={false}>
        Active
      </DataTableHeader>
    ),
    cell: ({ row }) => <ExitNodeActiveCell exitNode={row.original} />,
  },
  {
    accessorKey: "location",
    header: ({ column }) => (
      <DataTableHeader column={column}>Location</DataTableHeader>
    ),
    sortingFn: "text",
    cell: ({ row }) => <ExitNodeLocationCell exitNode={row.original} />,
  },
  {
    id: "high_availability",
    accessorKey: "active_peer_count",
    header: ({ column }) => (
      <DataTableHeader column={column}>High Availability</DataTableHeader>
    ),
    meta: { fit: true },
    cell: ({ row }) => <ExitNodeHighAvailabilityCell exitNode={row.original} />,
  },
  {
    id: "policies",
    accessorKey: "policy_count",
    header: ({ column }) => (
      <DataTableHeader column={column}>Policies</DataTableHeader>
    ),
    cell: ({ row }) => <ExitNodePolicyCell exitNode={row.original} />,
  },
  {
    id: "auto_apply",
    accessorKey: "auto_apply",
    header: ({ column }) => (
      <DataTableHeader column={column}>Auto Apply</DataTableHeader>
    ),
    meta: { fit: true },
    sortingFn: "basic",
    cell: ({ row }) => <ExitNodeAutoApplyCell exitNode={row.original} />,
  },
  {
    id: ACTIONS_COLUMN_ID,
    accessorKey: "id",
    header: "",
    meta: { fit: true },
    cell: ({ row }) => <ExitNodeActionCell exitNode={row.original} />,
  },
];

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function ExitNodesTable({ headingTarget }: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { exitNodes, peers, policies, isLoading } = useExitNodes();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "name", desc: false }],
  );

  const data = useMemo<ExitNodeRow[] | undefined>(
    () =>
      exitNodes?.map((node) => ({
        ...node,
        search: getExitNodeSearchText(node, peers, policies),
        location: getExitNodeLocations(node, peers).countries.join(" "),
        active_peer_count: getHighAvailability(node).activePeerCount,
        policy_count: getExitNodePolicies(node.id, policies).length,
      })),
    [exitNodes, peers, policies],
  );

  const statusOptions = useMemo<RadioOption<boolean | undefined>[]>(
    () => [
      { value: undefined, label: "All", dotClass: "bg-nb-gray-500" },
      { value: true, label: "Active", dotClass: "bg-green-500" },
      { value: false, label: "Inactive", dotClass: "bg-nb-gray-700" },
    ],
    [],
  );

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: ENABLED_COLUMN_ID,
        label: "Status",
        renderPicker: (p) => (
          <RadioPicker
            value={p.value as boolean | undefined}
            onChange={p.onChange}
            close={p.close}
            options={statusOptions}
          />
        ),
        formatChip: (v) =>
          formatRadioChip(v as boolean | undefined, statusOptions),
      },
    ],
    [statusOptions],
  );

  const hasExitNodes = !!exitNodes && exitNodes.length > 0;

  return (
    <>
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Exit Nodes"}
        sorting={sorting}
        setSorting={setSorting}
        columns={ExitNodeTableColumns}
        data={data}
        initialPageSize={25}
        showResetFilterButton={false}
        searchPlaceholder={"Search by name, peer or group..."}
        columnVisibility={{ search: false }}
        cellClassName={fadeDisabledRowCells}
        aboveTable={(table) => (
          <TableFilterChips table={table} filters={filterDefs} />
        )}
        renderExpandedRow={(node) => <ExitNodePeersTable exitNode={node} />}
        getStartedCard={
          <GetStartedTest
            icon={
              <SquareIcon
                icon={
                  <IconDirectionSign size={20} className={"text-nb-gray-200"} />
                }
                color={"gray"}
                size={"large"}
              />
            }
            title={"Create New Exit Node"}
            description={
              "It looks like you don't have any exit nodes. Route internet traffic through a peer by adding an exit node."
            }
            button={
              <div className={"gap-x-4 flex items-center justify-center"}>
                <AddExitNodeButton />
              </div>
            }
            learnMore={
              <>
                Learn more about
                <InlineLink href={EXIT_NODES_DOCS_URL} target={"_blank"}>
                  Exit Nodes
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </>
            }
          />
        }
        rightSide={() =>
          hasExitNodes && (
            <div className={"gap-x-4 ml-auto flex"}>
              <AddExitNodeButton />
            </div>
          )
        }
      >
        {(table) => (
          <>
            <TableFiltersButton
              table={table}
              filters={filterDefs}
              disabled={exitNodes?.length == 0}
            />
            <DataTableRefreshButton
              isDisabled={exitNodes?.length == 0}
              onClick={() => {
                mutate("/exit-nodes").then();
                mutate("/policies").then();
                mutate("/peers").then();
              }}
            />
            <DataTableResetFilterButton
              table={table}
              onClick={() => {
                table.setPageIndex(0);
                table.resetColumnFilters();
                table.resetGlobalFilter();
              }}
            />
          </>
        )}
      </DataTable>
    </>
  );
}

const AddExitNodeButton = () => {
  const permission = useExitNodePermissions();
  const { openExitNodeModal } = useExitNodes();
  return (
    <Button
      variant={"primary"}
      onClick={() => openExitNodeModal()}
      disabled={!permission?.create}
      data-testid={"add-exit-node"}
    >
      <PlusCircle size={16} />
      Add Exit Node
    </Button>
  );
};
