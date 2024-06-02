import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import SetupKeysIcon from "@/assets/icons/SetupKeysIcon";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { SetupKey } from "@/interfaces/SetupKey";
import ExpirationDateRow from "@/modules/common-table-rows/ExpirationDateRow";
import LastTimeRow from "@/modules/common-table-rows/LastTimeRow";
import SetupKeyActionCell from "@/modules/setup-keys/SetupKeyActionCell";
import SetupKeyEphemeralCell from "@/modules/setup-keys/SetupKeyEphemeralCell";
import SetupKeyGroupsCell from "@/modules/setup-keys/SetupKeyGroupsCell";
import SetupKeyModal from "@/modules/setup-keys/SetupKeyModal";
import SetupKeyNameCell from "@/modules/setup-keys/SetupKeyNameCell";
import SetupKeyUsageCell from "@/modules/setup-keys/SetupKeyUsageCell";

export const SetupKeysTableColumns: ColumnDef<SetupKey>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name & Key</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => (
      <SetupKeyNameCell
        name={row.original.name}
        valid={row.original.valid}
        secret={row.original.key}
      />
    ),
  },
  {
    id: "valid",
    accessorKey: "valid",
    sortingFn: "basic",
  },
  {
    accessorKey: "usage_limit",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Usage</DataTableHeader>;
    },
    cell: ({ row }) => (
      <SetupKeyUsageCell
        current={row.original.used_times}
        limit={row.original.usage_limit || 0}
        reusable={row.original.type == "reusable"}
      />
    ),
  },
  {
    accessorKey: "last_used",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Last used</DataTableHeader>;
    },
    sortingFn: "datetime",
    cell: ({ row }) => (
      <LastTimeRow date={row.original.last_used} text={"Last used on"} />
    ),
  },
  {
    id: "group_strings",
    accessorKey: "group_strings",
    accessorFn: (s) => s.groups?.map((g) => g?.name || "").join(", "),
  },
  {
    accessorFn: (item) => item.auto_groups?.length,
    id: "groups",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Groups</DataTableHeader>;
    },
    cell: ({ row }) => <SetupKeyGroupsCell setupKey={row.original} />,
  },
  {
    accessorKey: "ephemeral",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Ephemeral</DataTableHeader>;
    },
    cell: ({ row }) => (
      <SetupKeyEphemeralCell ephemeral={row.original.ephemeral} />
    ),
  },
  {
    accessorKey: "expires",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Expires</DataTableHeader>;
    },
    cell: ({ row }) => <ExpirationDateRow date={row.original.expires} />,
  },

  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => {
      return <SetupKeyActionCell setupKey={row.original} />;
    },
  },
];

type Props = {
  setupKeys?: SetupKey[];
  isLoading: boolean;
};
export default function SetupKeysTable({ setupKeys, isLoading }: Props) {
  const { mutate } = useSWRConfig();
  const path = usePathname();

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "valid",
        desc: true,
      },
      {
        id: "last_used",
        desc: true,
      },
      {
        id: "name",
        desc: true,
      },
    ],
  );

  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <SetupKeyModal open={open} setOpen={setOpen} />}
      <DataTable
        isLoading={isLoading}
        text={"Setup Keys"}
        sorting={sorting}
        setSorting={setSorting}
        columns={SetupKeysTableColumns}
        data={setupKeys}
        searchPlaceholder={"Search by name, type or group..."}
        columnVisibility={{
          valid: false,
          group_strings: false,
        }}
        getStartedCard={
          <GetStartedTest
            icon={
              <SquareIcon
                icon={
                  <SetupKeysIcon className={"fill-nb-gray-200"} size={20} />
                }
                color={"gray"}
                size={"large"}
              />
            }
            title={"Create Setup Key"}
            description={
              "Add a setup key to register new machines in your network. The key links machines to your account during initial setup."
            }
            button={
              <Button
                variant={"primary"}
                className={""}
                onClick={() => setOpen(true)}
              >
                <PlusCircle size={16} />
                Create Setup Key
              </Button>
            }
            learnMore={
              <>
                Learn more about
                <InlineLink
                  href={
                    "https://docs.netbird.io/how-to/register-machines-using-setup-keys"
                  }
                  target={"_blank"}
                >
                  Setup Keys
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </>
            }
          />
        }
        rightSide={() => (
          <>
            {setupKeys && setupKeys?.length > 0 && (
              <Button
                variant={"primary"}
                className={"ml-auto"}
                onClick={() => setOpen(true)}
              >
                <PlusCircle size={16} />
                Create Setup Key
              </Button>
            )}
          </>
        )}
      >
        {(table) => (
          <>
            <ButtonGroup disabled={setupKeys?.length == 0}>
              <ButtonGroup.Button
                onClick={() => {
                  table.setPageIndex(0);
                  table.getColumn("valid")?.setFilterValue(true);
                }}
                disabled={setupKeys?.length == 0}
                variant={
                  table.getColumn("valid")?.getFilterValue() == true
                    ? "tertiary"
                    : "secondary"
                }
              >
                Valid
              </ButtonGroup.Button>
              <ButtonGroup.Button
                onClick={() => {
                  table.setPageIndex(0);
                  table.getColumn("valid")?.setFilterValue("");
                }}
                disabled={setupKeys?.length == 0}
                variant={
                  table.getColumn("valid")?.getFilterValue() != true
                    ? "tertiary"
                    : "secondary"
                }
              >
                All
              </ButtonGroup.Button>
            </ButtonGroup>
            <DataTableRowsPerPage
              table={table}
              disabled={setupKeys?.length == 0}
            />
            <DataTableRefreshButton
              isDisabled={setupKeys?.length == 0}
              onClick={() => {
                mutate("/setup-keys").then();
                mutate("/groups").then();
              }}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
