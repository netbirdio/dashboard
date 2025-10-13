import { Peer } from "@/interfaces/Peer";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/Checkbox";
import DataTableHeader from "@/components/table/DataTableHeader";
import PeerNameCell from "../peers/PeerNameCell";
import PeerAddressCell from "../peers/PeerAddressCell";
import { PeerOSCell } from "../peers/PeerOSCell";
import { User } from "@/interfaces/User";
import UserNameCell from "../users/table-cells/UserNameCell";
import UserRoleCell from "../users/table-cells/UserRoleCell";
import UserStatusCell from "../users/table-cells/UserStatusCell";
import LastTimeRow from "../common-table-rows/LastTimeRow";
import dayjs from "dayjs";

export const AssignPeersTableColumns: ColumnDef<Peer>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className={"min-w-[20px] max-w-[20px]"}>
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    accessorFn: (peer) => peer.id,
    sortingFn: "checkbox",
    cell: ({ row }) => {
      return (
        <div className={"min-w-[20px] max-w-[20px]"}>
          <Checkbox
            variant={"tableCell"}
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      );
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <PeerNameCell peer={row.original} linkToPeer={false} />,
  },
  {
    id: "approval_required",
    accessorKey: "approval_required",
    sortingFn: "basic",
    accessorFn: (peer) => peer.approval_required,
  },
  {
    id: "connected",
    accessorKey: "connected",
    accessorFn: (peer) => peer.connected,
  },
  {
    accessorKey: "ip",
    sortingFn: "text",
  },
  {
    id: "user_name",
    accessorFn: (peer) => (peer.user ? peer.user?.name : "Unknown"),
  },
  {
    id: "user_email",
    accessorFn: (peer) => (peer.user ? peer.user?.email : "Unknown"),
  },
  {
    accessorKey: "dns_label",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Address</DataTableHeader>;
    },
    cell: ({ row }) => <PeerAddressCell peer={row.original} />,
  },
  {
    accessorKey: "group_name_strings",
    accessorFn: (peer) => peer.groups?.map((g) => g?.name || "").join(", "),
    sortingFn: "text",
  },
  {
    accessorKey: "group_names",
    accessorFn: (peer) => peer.groups?.map((g) => g?.name || ""),
    sortingFn: "text",
    filterFn: "arrIncludesSome",
  },
  {
    accessorKey: "os",
    header: ({ column }) => {
      return <DataTableHeader column={column}>OS</DataTableHeader>;
    },
    cell: ({ row }) => (
      <PeerOSCell os={row.original.os} serial={row.original.serial_number} />
    ),
  },
];

export const AssignUsersTableColumns: ColumnDef<User>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className={"min-w-[20px] max-w-[20px]"}>
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    accessorFn: (peer) => peer.id,
    sortingFn: "checkbox",
    cell: ({ row }) => {
      return (
        <div className={"min-w-[20px] max-w-[20px]"}>
          <Checkbox
            variant={"tableCell"}
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      );
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    accessorFn: (row) => row.name + " " + row.email,
    sortingFn: "text",
    cell: ({ row }) => <UserNameCell user={row.original} />,
  },
  {
    accessorKey: "is_current",
    sortingFn: "basic",
  },
  {
    accessorKey: "role",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Role</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <UserRoleCell user={row.original} />,
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Status</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <UserStatusCell user={row.original} />,
  },
  {
    accessorKey: "last_login",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Last Login</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => (
      <LastTimeRow
        date={dayjs(row.original.last_login).toDate()}
        text={"Last login on"}
      />
    ),
  },
  {
    id: "approval_required",
    accessorKey: "approval_required",
    sortingFn: "basic",
    accessorFn: (u) => u?.pending_approval,
  },
];
