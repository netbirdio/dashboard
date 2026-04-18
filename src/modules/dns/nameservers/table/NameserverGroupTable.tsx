"use client";

import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import Card from "@components/Card";
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
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import DNSIcon from "@/assets/icons/DNSIcon";
import NoResults from "@/components/ui/NoResults";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useI18n } from "@/i18n/I18nProvider";
import { Group } from "@/interfaces/Group";
import { NameserverGroup } from "@/interfaces/Nameserver";
import NameserverModal from "@/modules/dns/nameservers/NameserverModal";
import NameserverTemplateModal from "@/modules/dns/nameservers/NameserverTemplateModal";
import NameserverActionCell from "@/modules/dns/nameservers/table/NameserverActionCell";
import NameserverActiveCell from "@/modules/dns/nameservers/table/NameserverActiveCell";
import NameserverDistributionGroupsCell from "@/modules/dns/nameservers/table/NameserverDistributionGroupsCell";
import NameserverMatchDomainsCell from "@/modules/dns/nameservers/table/NameserverMatchDomainsCell";
import NameserverNameCell from "@/modules/dns/nameservers/table/NameserverNameCell";
import NameserverNameserversCell from "@/modules/dns/nameservers/table/NameserverNameserversCell";

function useNameserverGroupTableColumns() {
  const { t } = useI18n();

  return useMemo<ColumnDef<NameserverGroup>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => {
          return <DataTableHeader column={column}>{t("table.name")}</DataTableHeader>;
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
          return (
            <DataTableHeader column={column}>
              {t("nameservers.enabled")}
            </DataTableHeader>
          );
        },
        cell: ({ row }) => <NameserverActiveCell ns={row.original} />,
      },
      {
        accessorFn: (row) => row.domains?.length || 0,
        id: "domains",
        header: ({ column }) => {
          return (
            <DataTableHeader column={column}>
              {t("nameservers.matchDomains")}
            </DataTableHeader>
          );
        },
        cell: ({ row }) => <NameserverMatchDomainsCell ns={row.original} />,
      },
      {
        accessorFn: (row) => row.nameservers?.length || 0,
        id: "nameservers",
        header: ({ column }) => {
          return (
            <DataTableHeader column={column}>
              {t("nameservers.nameservers")}
            </DataTableHeader>
          );
        },
        cell: ({ row }) => <NameserverNameserversCell ns={row.original} />,
      },
      {
        accessorFn: (row) => row.groups?.length || 0,
        id: "groups",
        header: ({ column }) => {
          return (
            <DataTableHeader column={column}>
              {t("nameservers.distributionGroups")}
            </DataTableHeader>
          );
        },
        cell: ({ row }) => (
          <NameserverDistributionGroupsCell ns={row.original} />
        ),
      },
      {
        accessorKey: "id",
        header: "",
        cell: ({ cell }) => <NameserverActionCell ns={cell.row.original} />,
      },
    ],
    [t],
  );
}

type Props = {
  nameserverGroups?: NameserverGroup[];
  isLoading?: boolean;
  headingTarget?: HTMLHeadingElement | null;
  isGroupPage?: boolean;
  distributionGroups?: Group[];
};

export default function NameserverGroupTable({
  nameserverGroups,
  isLoading,
  headingTarget,
  isGroupPage,
  distributionGroups,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { t } = useI18n();
  const columns = useNameserverGroupTableColumns();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "name",
        desc: true,
      },
    ],
    !isGroupPage,
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
        text={t("nameservers.tableTitle")}
        sorting={sorting}
        setSorting={setSorting}
        wrapperComponent={isGroupPage ? Card : undefined}
        wrapperProps={isGroupPage ? { className: "mt-6 w-full" } : undefined}
        paginationPaddingClassName={isGroupPage ? "px-0 pt-8" : undefined}
        tableClassName={isGroupPage ? "mt-0" : undefined}
        inset={false}
        minimal={isGroupPage}
        showSearchAndFilters={isGroupPage}
        keepStateInLocalStorage={!isGroupPage}
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
        columns={columns}
        data={nameserverGroups}
        searchPlaceholder={t("nameservers.searchPlaceholder")}
        getStartedCard={
          isGroupPage ? (
            <NoResults
              icon={<DNSIcon className={"fill-nb-gray-200"} size={20} />}
              className={"py-4"}
              title={t("nameservers.emptyGroupTitle")}
              description={t("nameservers.emptyGroupDescription")}
            >
              <NameserverTemplateModal distributionGroups={distributionGroups}>
                <Button
                  variant={"primary"}
                  className={"mt-4"}
                  disabled={!permission.nameservers.create}
                >
                  <PlusCircle size={16} />
                  {t("nameservers.add")}
                </Button>
              </NameserverTemplateModal>
            </NoResults>
          ) : (
            <GetStartedTest
              icon={
                <SquareIcon
                  icon={<DNSIcon className={"fill-nb-gray-200"} size={20} />}
                  color={"gray"}
                  size={"large"}
                />
              }
              title={t("nameservers.emptyTitle")}
              description={t("nameservers.emptyDescription")}
              button={
                <div className={"flex flex-col"}>
                  <div>
                    <NameserverTemplateModal
                      distributionGroups={distributionGroups}
                    >
                      <Button
                        variant={"primary"}
                        className={""}
                        disabled={!permission.nameservers.create}
                      >
                        <PlusCircle size={16} />
                        {t("nameservers.add")}
                      </Button>
                    </NameserverTemplateModal>
                  </div>
                </div>
              }
              learnMore={
                <>
                  {t("common.learnMorePrefix")}
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
          )
        }
        rightSide={() => (
          <>
            {nameserverGroups && nameserverGroups.length > 0 && (
              <NameserverTemplateModal distributionGroups={distributionGroups}>
                <Button
                  variant={"primary"}
                  className={"ml-auto"}
                  disabled={!permission.nameservers.create}
                >
                  <PlusCircle size={16} />
                  {t("nameservers.add")}
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
                {t("nameservers.enabled")}
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
                {t("filters.all")}
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
