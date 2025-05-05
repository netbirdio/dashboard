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
import DNSIcon from "@/assets/icons/DNSIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { NameserverGroup } from "@/interfaces/Nameserver";
import NameserverModal from "@/modules/dns-nameservers/NameserverModal";
import NameserverTemplateModal from "@/modules/dns-nameservers/NameserverTemplateModal";
import NameserverActionCell from "@/modules/dns-nameservers/table/NameserverActionCell";
import NameserverActiveCell from "@/modules/dns-nameservers/table/NameserverActiveCell";
import NameserverDistributionGroupsCell from "@/modules/dns-nameservers/table/NameserverDistributionGroupsCell";
import NameserverMatchDomainsCell from "@/modules/dns-nameservers/table/NameserverMatchDomainsCell";
import NameserverNameCell from "@/modules/dns-nameservers/table/NameserverNameCell";
import NameserverNameserversCell from "@/modules/dns-nameservers/table/NameserverNameserversCell";

export const NameserverGroupTableColumns: ColumnDef<NameserverGroup>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <NameserverNameCell ns={row.original} />,
  },
  {
    accessorKey: "description",
    sortingFn: "text",
  },
  {
    id: "domain_list",
    accessorFn: (row) => row.domains?.map((d) => d).join(", "),
  },
  {
    id: "ns_list",
    accessorFn: (row) => row.nameservers?.map((n) => n.ip).join(", "),
  },
  {
    accessorKey: "enabled",
    sortingFn: "basic",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Active</DataTableHeader>;
    },
    cell: ({ row }) => <NameserverActiveCell ns={row.original} />,
  },
  {
    accessorFn: (row) => row.domains?.length || 0,
    id: "domains",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Match Domains</DataTableHeader>;
    },
    cell: ({ row }) => <NameserverMatchDomainsCell ns={row.original} />,
  },
  {
    accessorFn: (row) => row.nameservers?.length || 0,
    id: "nameservers",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Nameservers</DataTableHeader>;
    },
    cell: ({ row }) => <NameserverNameserversCell ns={row.original} />,
  },
  {
    accessorFn: (row) => row.groups?.length || 0,
    id: "groups",
    header: ({ column }) => {
      return (
        <DataTableHeader column={column}>Distribution Groups</DataTableHeader>
      );
    },
    cell: ({ row }) => <NameserverDistributionGroupsCell ns={row.original} />,
  },
  {
    accessorKey: "id",
    header: "",
    cell: ({ cell }) => <NameserverActionCell ns={cell.row.original} />,
  },
];

type Props = {
  nameserverGroups?: NameserverGroup[];
  isLoading?: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function NameserverGroupTable({
  nameserverGroups,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();

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
  const [currentRow, setCurrentRow] = useState<NameserverGroup>();
  const [currentCellClicked, setCurrentCellClicked] = useState("");

  return (
    <>
      {editModal && currentRow && (
        <NameserverModal
          preset={currentRow}
          open={editModal}
          onOpenChange={setEditModal}
          cell={currentCellClicked}
        />
      )}
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Network Routes"}
        sorting={sorting}
        setSorting={setSorting}
        columnVisibility={{
          description: false,
          domain_list: false,
          ns_list: false,
        }}
        onRowClick={(row, cell) => {
          setCurrentRow(row.original);
          setEditModal(true);
          setCurrentCellClicked(cell);
        }}
        columns={NameserverGroupTableColumns}
        data={nameserverGroups}
        searchPlaceholder={"Search by name, domains or nameservers..."}
        getStartedCard={
          <GetStartedTest
            icon={
              <SquareIcon
                icon={<DNSIcon className={"fill-nb-gray-200"} size={20} />}
                color={"gray"}
                size={"large"}
              />
            }
            title={"Create Nameserver"}
            description={
              "It looks like you don't have any nameservers. Get started by adding one to your network. Select a predefined or add your custom nameservers."
            }
            button={
              <div className={"flex flex-col"}>
                <div>
                  <NameserverTemplateModal>
                    <Button
                      variant={"primary"}
                      className={""}
                      disabled={!permission.nameservers.create}
                    >
                      <PlusCircle size={16} />
                      Add Nameserver
                    </Button>
                  </NameserverTemplateModal>
                </div>
              </div>
            }
            learnMore={
              <>
                Learn more about
                <InlineLink
                  href={
                    "https://docs.netbird.io/how-to/manage-dns-in-your-network"
                  }
                  target={"_blank"}
                >
                  DNS
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </>
            }
          />
        }
        rightSide={() => (
          <>
            {nameserverGroups && nameserverGroups?.length > 0 && (
              <NameserverTemplateModal>
                <Button
                  variant={"primary"}
                  className={"ml-auto"}
                  disabled={!permission.nameservers.create}
                >
                  <PlusCircle size={16} />
                  Add Nameserver
                </Button>
              </NameserverTemplateModal>
            )}
          </>
        )}
      >
        {(table) => (
          <>
            <ButtonGroup disabled={nameserverGroups?.length == 0}>
              <ButtonGroup.Button
                onClick={() => {
                  table.setPageIndex(0);
                  table.getColumn("enabled")?.setFilterValue(true);
                }}
                disabled={nameserverGroups?.length == 0}
                variant={
                  table.getColumn("enabled")?.getFilterValue() == true
                    ? "tertiary"
                    : "secondary"
                }
              >
                Enabled
              </ButtonGroup.Button>
              <ButtonGroup.Button
                onClick={() => {
                  table.setPageIndex(0);
                  table.getColumn("enabled")?.setFilterValue("");
                }}
                disabled={nameserverGroups?.length == 0}
                variant={
                  table.getColumn("enabled")?.getFilterValue() != true
                    ? "tertiary"
                    : "secondary"
                }
              >
                All
              </ButtonGroup.Button>
            </ButtonGroup>
            <DataTableRowsPerPage
              table={table}
              disabled={nameserverGroups?.length == 0}
            />
            <DataTableRefreshButton
              isDisabled={nameserverGroups?.length == 0}
              onClick={() => {
                mutate("/dns/nameservers").then();
              }}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
