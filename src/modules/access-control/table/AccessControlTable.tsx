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
import { removeAllSpaces } from "@utils/helpers";
import { ClockFadingIcon, ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
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
import AccessControlPostureCheckCell from "@/modules/access-control/table/AccessControlPostureCheckCell";
import AccessControlProtocolCell from "@/modules/access-control/table/AccessControlProtocolCell";
import AccessControlSourcesCell from "@/modules/access-control/table/AccessControlSourcesCell";
import FullTooltip from "@components/FullTooltip";
import Card from "@components/Card";
import NoResults from "@/components/ui/NoResults";

type Props = {
  policies?: Policy[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
  inGroup?: boolean;
};

export const AccessControlTableColumns: ColumnDef<Policy>[] = [
  {
    id: "name",
    accessorFn: (row) => removeAllSpaces(row?.name),
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    sortingFn: "text",
    filterFn: "fuzzy",
    cell: ({ cell }) => <AccessControlNameCell policy={cell.row.original} />,
  },
  {
    id: "description",
    accessorFn: (row) => removeAllSpaces(row?.description),
    sortingFn: "text",
    filterFn: "fuzzy",
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
    id: "posture_checks",
    accessorFn: (row) => row.source_posture_checks?.length || 0,
    sortingFn: "basic",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Posture Checks</DataTableHeader>;
    },
    cell: ({ cell }) => (
      <AccessControlPostureCheckCell policy={cell.row.original} />
    ),
  },
  {
    id: "id",
    accessorKey: "id",
    filterFn: "exactMatch",
  },
  {
    id: "actions",
    accessorKey: "id",
    header: "",
    cell: ({ cell }) => <AccessControlActionCell policy={cell.row.original} />,
  },
];

export default function AccessControlTable({
  policies,
  isLoading,
  headingTarget,
  inGroup
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const params = useSearchParams();
  const idParam = params.get("id") && !inGroup ? params.get("id"): undefined;

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

  const [showTemporaryPolicies, setShowTemporaryPolicies] = useState(false);

  const withTemporaryPolicies = useCallback(
    (condition: boolean) =>
      policies?.filter((policy) =>
        condition
          ? policy?.name?.startsWith("Temporary") &&
          policy?.name?.endsWith("client") &&
          policy?.description?.startsWith("Temporary") &&
          policy?.description?.endsWith("client")
          : !(
            policy?.name?.startsWith("Temporary") &&
            policy?.name?.endsWith("client") &&
            policy?.description?.startsWith("Temporary") &&
            policy?.description?.endsWith("client")
          ),
      ) ?? [],
    [policies],
  );

  const tempPolicies = useMemo(
    () => withTemporaryPolicies(true),
    [withTemporaryPolicies],
  );
  const regularPolicies = useMemo(
    () => withTemporaryPolicies(false),
    [withTemporaryPolicies],
  );

  useEffect(() => {
    if (showTemporaryPolicies && tempPolicies?.length === 0) {
      setShowTemporaryPolicies(false);
    }
  }, [showTemporaryPolicies, tempPolicies]);

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
        headingTarget={headingTarget}
        isLoading={isLoading}
        wrapperComponent={inGroup ? Card : undefined}
        wrapperProps={inGroup ? { className: "mt-6 w-full" } : undefined}
        paginationPaddingClassName={inGroup ? "px-0 pt-8": undefined}
        tableClassName={inGroup ? "mt-0" : undefined}
        inset={!inGroup}
        minimal={inGroup}
        showSearchAndFilters={inGroup}
        keepStateInLocalStorage={!inGroup || !idParam}
        initialSearch={idParam ? "" : undefined}
        initialFilters={
          idParam
            ? [
              {
                id: "id",
                value: idParam,
              },
            ]
            : undefined
        }
        text={"Access Control Policies"}
        sorting={sorting}
        setSorting={setSorting}
        columns={AccessControlTableColumns}
        columnVisibility={{
          description: false,
          id: false,
          temporary: false,
        }}
        data={showTemporaryPolicies ? tempPolicies : regularPolicies}
        onRowClick={(row, cell) => {
          setCurrentRow(row.original);
          setEditModal(true);
          setCurrentCellClicked(cell);
        }}
        searchPlaceholder={"Search by name and description..."}
        getStartedCard={inGroup ? <NoResults
          className={"py-4"}
          title={"No Policy assigned to this group"}
          icon={<AccessControlIcon className={"fill-nb-gray-200"} size={20} />}
        /> :
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
              <div className={"flex gap-4 items-center justify-center"}>
                <AccessControlModal>
                  <Button
                    variant={"primary"}
                    disabled={!permission.policies.create}
                  >
                    <PlusCircle size={16} />
                    Add Policy
                  </Button>
                </AccessControlModal>
              </div>
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
              <div className={"flex ml-auto gap-4"}>
                <AccessControlModal>
                  <Button
                    variant={"primary"}
                    className={"ml-auto"}
                    disabled={!permission.policies.create}
                  >
                    <PlusCircle size={16} />
                    Add Policy
                  </Button>
                </AccessControlModal>
              </div>
            )}
          </>
        )}
      >
        {(table) => {
          return (
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

              {tempPolicies?.length > 0 && (
                <FullTooltip
                  content={
                    <div className={"max-w-sm text-xs"}>
                      Show temporary policies created by the NetBird browser
                      client. These policies are ephemeral and will be
                      deleted automatically after a short period of time.
                    </div>
                  }
                >
                  <Button
                    className={"h-[44px]"}
                    variant={showTemporaryPolicies ? "tertiary" : "secondary"}
                    onClick={() => {
                      setShowTemporaryPolicies(!showTemporaryPolicies);
                    }}
                  >
                    <ClockFadingIcon size={16} />
                  </Button>
                </FullTooltip>
              )}

              <DataTableRefreshButton
                isDisabled={policies?.length == 0}
                onClick={() => {
                  mutate("/policies").then();
                  mutate("/groups").then();
                }}
              />
            </>
          );
        }}
      </DataTable>
    </>
  );
}
