import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import {
  ACTIONS_COLUMN_ID,
  ENABLED_COLUMN_ID,
  fadeDisabledRowCells,
} from "@components/table/disabledRowCells";
import { ENABLED_COLUMN_CLASS } from "@components/table/enabledColumnClass";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { MoreVertical, PowerIcon, SquarePenIcon, Trash2 } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import { useCountries } from "@/contexts/CountryProvider";
import { useDialog } from "@/contexts/DialogProvider";
import { ExitNode, ExitNodePeer } from "@/interfaces/ExitNode";
import { Peer } from "@/interfaces/Peer";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";
import { useExitNodes } from "@/modules/exit-nodes/ExitNodesProvider";
import { useExitNodePermissions } from "@/modules/exit-nodes/useExitNodePermissions";
import { PeerOperatingSystemIcon } from "@/modules/peers/PeerOperatingSystemIcon";
import RouteMetricCell from "@/modules/routes/RouteMetricCell";

type Row = ExitNodePeer & {
  id: string;
  peer?: Peer;
  location: string;
  exitNode: ExitNode;
};

type CellProps = { row: Row };

const PeerNameCell = ({ row }: CellProps) => (
  <div className={"flex items-center min-w-[295px] max-w-[295px]"}>
    <ActiveInactiveRow
      active={!!row.peer?.connected}
      inactiveDot={"gray"}
      text={row.peer?.name ?? row.peer_id}
      additionalInfo={row.peer && <PeerOperatingSystemIcon os={row.peer.os} />}
    >
      <div className={"text-sm text-nb-gray-400 font-light mt-1"}>
        {row.peer?.ip ?? "Unknown peer"}
      </div>
    </ActiveInactiveRow>
  </div>
);

const PeerLocationCell = ({ row }: CellProps) => {
  if (!row.peer?.country_code) return null;
  return (
    <div
      className={
        "flex gap-2.5 items-center text-nb-gray-300 dark:text-neutral-300 font-light"
      }
    >
      <RoundedFlag country={row.peer.country_code} size={12} />
      {row.location}
    </div>
  );
};

const usePeerChanges = (exitNode: ExitNode) => {
  const { updateExitNode } = useExitNodes();
  // Built from the node's latest state when the write runs, so a change made
  // meanwhile (another toggle, or one that landed while a dialog was open)
  // isn't reverted.
  const update = (
    getPeers: (peers: ExitNodePeer[]) => ExitNodePeer[],
    message: string,
  ) =>
    updateExitNode(
      exitNode,
      (latest) => ({ peers: getPeers(latest.peers) }),
      message,
    );
  return {
    toggle: (row: Row) =>
      update(
        (peers) =>
          peers.map((p) =>
            p.peer_id === row.peer_id ? { ...p, enabled: !row.enabled } : p,
          ),
        `Peer ${row.peer?.name ?? row.peer_id} was ${
          row.enabled ? "disabled" : "enabled"
        } for the exit node`,
      ),
    remove: (row: Row) =>
      update(
        (peers) => peers.filter((p) => p.peer_id !== row.peer_id),
        `Peer ${row.peer?.name ?? row.peer_id} was removed from the exit node`,
      ),
  };
};

const PeerActiveCell = ({ row }: CellProps) => {
  const permission = useExitNodePermissions();
  const { toggle } = usePeerChanges(row.exitNode);
  return (
    <div className={"flex"}>
      <ToggleSwitch
        checked={row.enabled}
        size={"small"}
        onClick={() => toggle(row)}
        disabled={!permission?.update}
        aria-label={`Use ${row.peer?.name ?? row.peer_id}`}
      />
    </div>
  );
};

const PeerActionCell = ({ row }: CellProps) => {
  const { exitNode } = row;
  const permission = useExitNodePermissions();
  const { openExitNodeModal } = useExitNodes();
  const { toggle, remove } = usePeerChanges(exitNode);
  const { confirm } = useDialog();
  const [open, setOpen] = useState(false);
  const name = row.peer?.name ?? row.peer_id;
  // An exit node keeps at least one peer; delete the exit node instead.
  const isLastPeer = exitNode.peers.length <= 1;

  const confirmRemove = async () => {
    const choice = await confirm({
      title: `Remove '${name}'?`,
      description:
        "Are you sure you want to remove this peer from the exit node? Internet traffic will no longer exit through it.",
      confirmText: "Remove",
      cancelText: "Cancel",
      type: "danger",
    });
    if (choice) remove(row);
  };

  return (
    <div className={"flex justify-end pr-4"}>
      <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild={true} disabled={!permission?.update}>
          <Button
            variant={"secondary"}
            className={"!px-3"}
            disabled={!permission?.update}
            aria-label={`Actions for peer ${name}`}
          >
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto" align="end">
          <DropdownMenuItem
            onClick={() => openExitNodeModal(exitNode, { tab: "peers" })}
          >
            <div className={"flex gap-3 items-center"}>
              <SquarePenIcon size={14} className={"shrink-0"} />
              Edit
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setOpen(false);
              toggle(row);
            }}
          >
            <div className={"flex gap-3 items-center"}>
              <PowerIcon size={14} className={"shrink-0"} />
              {row.enabled ? "Disable" : "Enable"}
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={confirmRemove}
            variant={"danger"}
            disabled={isLastPeer}
          >
            <div className={"flex gap-3 items-center"}>
              <Trash2 size={14} className={"shrink-0"} />
              Remove
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// Module-level so cells keep their identity (and open menus) across updates.
const ExitNodePeerColumns: ColumnDef<Row>[] = [
  {
    id: "name",
    accessorFn: (row) => row.peer?.name ?? row.peer_id,
    header: ({ column }) => (
      <DataTableHeader column={column}>Name</DataTableHeader>
    ),
    sortingFn: "text",
    cell: ({ row }) => <PeerNameCell row={row.original} />,
  },
  {
    id: "location",
    accessorKey: "location",
    header: ({ column }) => (
      <DataTableHeader column={column}>Location</DataTableHeader>
    ),
    sortingFn: "text",
    cell: ({ row }) => <PeerLocationCell row={row.original} />,
  },
  {
    id: "metric",
    accessorKey: "metric",
    header: ({ column }) => (
      <DataTableHeader column={column}>Metric</DataTableHeader>
    ),
    sortingFn: "basic",
    cell: ({ row }) => <RouteMetricCell metric={row.original.metric} />,
  },
  {
    id: ENABLED_COLUMN_ID,
    accessorKey: "enabled",
    enableSorting: false,
    meta: { className: ENABLED_COLUMN_CLASS.xl },
    header: ({ column }) => (
      <DataTableHeader column={column} sorting={false}>
        Active
      </DataTableHeader>
    ),
    cell: ({ row }) => <PeerActiveCell row={row.original} />,
  },
  {
    id: ACTIONS_COLUMN_ID,
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <PeerActionCell row={row.original} />,
  },
];

type Props = {
  exitNode: ExitNode;
};

/** The peers of an exit node, shown when its row is expanded. */
export default function ExitNodePeersTable({ exitNode }: Readonly<Props>) {
  const { peers } = useExitNodes();
  const { countries } = useCountries();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "metric", desc: false },
  ]);

  const data = useMemo<Row[]>(
    () =>
      exitNode.peers.map((entry) => {
        const peer = peers?.find((p) => p.id === entry.peer_id);
        const code = peer?.country_code?.toUpperCase();
        const country = code
          ? countries?.find((c) => c.country_code === code)?.country_name ??
            code
          : "";
        return {
          ...entry,
          id: entry.peer_id,
          peer,
          exitNode,
          location: [peer?.city_name, country].filter(Boolean).join(", "),
        };
      }),
    [exitNode, peers, countries],
  );

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DataTable
        tableClassName={"mt-0"}
        tableHeadClassName={"px-4"}
        tableCellClassName={"px-4"}
        minimal={true}
        showSearchAndFilters={false}
        className={"bg-nb-gray-960 py-2"}
        inset={true}
        text={"Peers"}
        manualPagination={true}
        sorting={sorting}
        setSorting={setSorting}
        cellClassName={fadeDisabledRowCells}
        columns={ExitNodePeerColumns}
        data={data}
      />
    </div>
  );
}
