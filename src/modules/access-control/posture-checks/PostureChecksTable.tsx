import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import { useLocalStorage } from "@hooks/useLocalStorage";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import type { Policy } from "@/interfaces/Policy";
import AccessControlModal, {
  AccessControlUpdateModal,
} from "@/modules/access-control/rules/AccessControlModal";
import AccessControlActionCell from "@/modules/access-control/rules/table/AccessControlActionCell";
import AccessControlActiveCell from "@/modules/access-control/rules/table/AccessControlActiveCell";
import AccessControlDestinationsCell from "@/modules/access-control/rules/table/AccessControlDestinationsCell";
import AccessControlDirectionCell from "@/modules/access-control/rules/table/AccessControlDirectionCell";
import AccessControlNameCell from "@/modules/access-control/rules/table/AccessControlNameCell";
import AccessControlPortsCell from "@/modules/access-control/rules/table/AccessControlPortsCell";
import AccessControlProtocolCell from "@/modules/access-control/rules/table/AccessControlProtocolCell";
import AccessControlSourcesCell from "@/modules/access-control/rules/table/AccessControlSourcesCell";
import RouteModal from "@/modules/routes/RouteModal";

type Props = {
  postureChecks?: Policy[];
  isLoading: boolean;
};

export const PostureChecksColumns: ColumnDef<Policy>[] = [
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

export default function PostureChecksTable({
  postureChecks,
  isLoading,
}: Props) {
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
        columns={PostureChecksColumns}
        columnVisibility={{
          description: false,
        }}
        data={postureChecks}
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
            title={"Create New Rule"}
            description={
              "It looks like you don't have any rules yet. Rules can allow connections by specific protocol and ports."
            }
            button={
              <RouteModal>
                <Button variant={"primary"} className={""}>
                  <PlusCircle size={16} />
                  Add Rule
                </Button>
              </RouteModal>
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
            {postureChecks && postureChecks?.length > 0 && (
              <AccessControlModal>
                <Button variant={"primary"} className={"ml-auto"}>
                  <PlusCircle size={16} />
                  Add Rule
                </Button>
              </AccessControlModal>
            )}
          </>
        )}
      >
        {(table) => (
          <>
            <ButtonGroup disabled={postureChecks?.length == 0}>
              <ButtonGroup.Button
                onClick={() => {
                  table.setPageIndex(0);
                  table.getColumn("enabled")?.setFilterValue(undefined);
                }}
                disabled={postureChecks?.length == 0}
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
                disabled={postureChecks?.length == 0}
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
                disabled={postureChecks?.length == 0}
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
              disabled={postureChecks?.length == 0}
            />
            <DataTableRefreshButton
              isDisabled={postureChecks?.length == 0}
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
