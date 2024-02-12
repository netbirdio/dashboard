import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Policy } from "@/interfaces/Policy";
import AccessControlModal, {
  AccessControlUpdateModal,
} from "@/modules/access-control/AccessControlModal";
import AccessControlActionCell from "@/modules/access-control/table/AccessControlActionCell";
import AccessControlActiveCell from "@/modules/access-control/table/AccessControlActiveCell";
import AccessControlDestinationsCell from "@/modules/access-control/table/AccessControlDestinationsCell";
import AccessControlDirectionCell from "@/modules/access-control/table/AccessControlDirectionCell";
import AccessControlNameCell from "@/modules/access-control/table/AccessControlNameCell";
import AccessControlPortsCell from "@/modules/access-control/table/AccessControlPortsCell";
import AccessControlProtocolCell from "@/modules/access-control/table/AccessControlProtocolCell";
import AccessControlSourcesCell from "@/modules/access-control/table/AccessControlSourcesCell";

type Props = {
  policies?: Policy[];
  isLoading: boolean;
};

export const AccessControlTableColumns: ColumnDef<Policy>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ cell }) => <AccessControlNameCell policy={cell.row.original} />,
  },
  {
    accessorKey: "description",
    sortingFn: "text",
  },
  {
    id: "enabled",
    accessorKey: "enabled",
    accessorFn: (row) => row.enabled,
    sortingFn: "basic",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Active</DataTableHeader>;
    },
    cell: ({ cell }) => <AccessControlActiveCell policy={cell.row.original} />,
  },
  {
    id: "sources",
    accessorFn: (row) => {
      try {
        return row.rules[0].sources?.length || 0;
      } catch (e) {
        console.log(e);
      }
      return 0;
    },
    sortingFn: "basic",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Sources</DataTableHeader>;
    },
    cell: ({ cell }) => <AccessControlSourcesCell policy={cell.row.original} />,
  },
  {
    id: "direction",
    accessorFn: (row) => {
      try {
        return row.rules[0].bidirectional || true;
      } catch (e) {
        console.log(e);
      }
      return 0;
    },
    sortingFn: "basic",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Direction</DataTableHeader>;
    },
    cell: ({ cell }) => (
      <AccessControlDirectionCell policy={cell.row.original} />
    ),
  },
  {
    id: "destinations",
    accessorFn: (row) => {
      try {
        return row.rules[0].destinations?.length || 0;
      } catch (e) {
        console.log(e);
      }
      return 0;
    },
    sortingFn: "basic",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Destinations</DataTableHeader>;
    },
    cell: ({ cell }) => (
      <AccessControlDestinationsCell policy={cell.row.original} />
    ),
  },

  {
    id: "protocol",
    accessorFn: (row) => {
      try {
        return row.rules[0].protocol || 0;
      } catch (e) {
        console.log(e);
      }
      return 0;
    },
    sortingFn: "basic",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Protocol</DataTableHeader>;
    },
    cell: ({ cell }) => (
      <AccessControlProtocolCell policy={cell.row.original} />
    ),
  },
  {
    id: "ports",
    accessorFn: (row) => {
      try {
        return row.rules[0].ports?.length || 0;
      } catch (e) {
        console.log(e);
      }
      return 0;
    },
    sortingFn: "basic",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Ports</DataTableHeader>;
    },
    cell: ({ cell }) => <AccessControlPortsCell policy={cell.row.original} />,
  },
  {
    accessorKey: "id",
    header: "",
    cell: ({ cell }) => <AccessControlActionCell policy={cell.row.original} />,
  },
];

export default function AccessControlTable({ policies, isLoading }: Props) {
  const { mutate } = useSWRConfig();
  const path = usePathname();

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "name",
        desc: true,
      },
    ],
  );

  const [editModal, setEditModal] = useState(false);
  const [currentRow, setCurrentRow] = useState<Policy>();
  const [currentCellClicked, setCurrentCellClicked] = useState("");

  return (
    <>
      {editModal && currentRow && (
        <AccessControlUpdateModal
          policy={currentRow}
          open={editModal}
          onOpenChange={setEditModal}
          cell={currentCellClicked}
        />
      )}
      <DataTable
        isLoading={isLoading}
        text={"Access Control"}
        sorting={sorting}
        setSorting={setSorting}
        columns={AccessControlTableColumns}
        columnVisibility={{
          description: false,
        }}
        data={policies}
        onRowClick={(row, cell) => {
          setCurrentRow(row.original);
          setEditModal(true);
          setCurrentCellClicked(cell);
        }}
        searchPlaceholder={"Search by name and description..."}
        getStartedCard={
          <GetStartedTest
            icon={
              <SquareIcon
                icon={
                  <AccessControlIcon className={"fill-nb-gray-200"} size={20} />
                }
                color={"gray"}
                size={"large"}
              />
            }
            title={"Create New Policy"}
            description={
              "It looks like you don't have any policies yet. Policies can allow connections by specific protocol and ports."
            }
            button={
              <AccessControlModal>
                <Button variant={"primary"} className={""}>
                  <PlusCircle size={16} />
                  Add Policy
                </Button>
              </AccessControlModal>
            }
            learnMore={
              <>
                Learn more about
                <InlineLink
                  href={"https://docs.netbird.io/how-to/manage-network-access"}
                  target={"_blank"}
                >
                  Access Controls
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </>
            }
          />
        }
        rightSide={() => (
          <>
            {policies && policies?.length > 0 && (
              <AccessControlModal>
                <Button variant={"primary"} className={"ml-auto"}>
                  <PlusCircle size={16} />
                  Add Policy
                </Button>
              </AccessControlModal>
            )}
          </>
        )}
      >
        {(table) => (
          <>
            <ButtonGroup disabled={policies?.length == 0}>
              <ButtonGroup.Button
                onClick={() => {
                  table.setPageIndex(0);
                  table.getColumn("enabled")?.setFilterValue(undefined);
                }}
                disabled={policies?.length == 0}
                variant={
                  table.getColumn("enabled")?.getFilterValue() === undefined
                    ? "tertiary"
                    : "secondary"
                }
              >
                All
              </ButtonGroup.Button>
              <ButtonGroup.Button
                onClick={() => {
                  table.setPageIndex(0);
                  table.getColumn("enabled")?.setFilterValue(true);
                }}
                disabled={policies?.length == 0}
                variant={
                  table.getColumn("enabled")?.getFilterValue() === true
                    ? "tertiary"
                    : "secondary"
                }
              >
                Active
              </ButtonGroup.Button>
              <ButtonGroup.Button
                onClick={() => {
                  table.setPageIndex(0);
                  table.getColumn("enabled")?.setFilterValue(false);
                }}
                disabled={policies?.length == 0}
                variant={
                  table.getColumn("enabled")?.getFilterValue() === false
                    ? "tertiary"
                    : "secondary"
                }
              >
                Inactive
              </ButtonGroup.Button>
            </ButtonGroup>
            <DataTableRowsPerPage
              table={table}
              disabled={policies?.length == 0}
            />
            <DataTableRefreshButton
              isDisabled={policies?.length == 0}
              onClick={() => {
                mutate("/policies").then();
                mutate("/groups").then();
              }}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
