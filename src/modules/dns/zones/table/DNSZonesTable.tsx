"use client";

import DNSZoneIcon from "@/assets/icons/DNSZoneIcon";
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
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useI18n } from "@/i18n/I18nProvider";
import { DNS_ZONE_DOCS_LINK, DNSZone } from "@/interfaces/DNS";
import { Group } from "@/interfaces/Group";
import { useDNSZones } from "@/modules/dns/zones/DNSZonesProvider";
import DNSRecordsTable from "@/modules/dns/zones/records/DNSRecordsTable";
import { DNSZonesActionCell } from "@/modules/dns/zones/table/DNSZonesActionCell";
import { DNSZonesActiveCell } from "@/modules/dns/zones/table/DNSZonesActiveCell";
import { DNSZonesGroupCell } from "@/modules/dns/zones/table/DNSZonesGroupCell";
import { DNSZonesNameCell } from "@/modules/dns/zones/table/DNSZonesNameCell";
import { DNSZonesRecordsCell } from "@/modules/dns/zones/table/DNSZonesRecordsCell";
import { DNSZonesSearchDomainCell } from "@/modules/dns/zones/table/DNSZonesSearchDomainCell";

function useDNSZonesColumns() {
  const { t } = useI18n();

  return useMemo<ColumnDef<DNSZone>[]>(
    () => [
      {
        accessorKey: "domain",
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("zones.zone")}</DataTableHeader>
        ),
        sortingFn: "text",
        cell: ({ row }) => <DNSZonesNameCell zone={row.original} />,
      },
      {
        accessorKey: "enabled",
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("table.active")}</DataTableHeader>
        ),
        cell: ({ row }) => <DNSZonesActiveCell zone={row.original} />,
      },
      {
        accessorKey: "records",
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("zones.records")}</DataTableHeader>
        ),
        sortingFn: "text",
        cell: ({ row }) => <DNSZonesRecordsCell zone={row.original} />,
      },
      {
        accessorKey: "distribution_groups",
        header: ({ column }) => (
          <DataTableHeader column={column}>
            {t("zones.distributionGroups")}
          </DataTableHeader>
        ),
        cell: ({ row }) => <DNSZonesGroupCell zone={row.original} />,
      },
      {
        accessorKey: "enable_search_domain",
        header: ({ column }) => (
          <DataTableHeader column={column}>
            {t("zones.searchDomain")}
          </DataTableHeader>
        ),
        cell: ({ row }) => <DNSZonesSearchDomainCell zone={row.original} />,
      },
      {
        accessorKey: "id",
        header: () => "",
        cell: ({ row }) => <DNSZonesActionCell zone={row.original} />,
      },
      {
        id: "searchString",
        accessorFn: (row) => {
          return [
            row?.groups_search,
            row?.name,
            row?.domain,
            row?.records?.map((r) => r.name).join(""),
            row?.records?.map((r) => r.content).join(""),
            row?.records?.map((r) => r.type).join(""),
          ].join("");
        },
      },
    ],
    [t],
  );
}

type Props = {
  isLoading: boolean;
  data?: DNSZone[];
  headingTarget?: HTMLHeadingElement | null;
  isGroupPage?: boolean;
  distributionGroups?: Group[];
};

export default function DNSZonesTable({
  data,
  isLoading,
  headingTarget,
  isGroupPage = false,
  distributionGroups,
}: Props) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { groups } = useGroups();
  const { t } = useI18n();
  const columns = useDNSZonesColumns();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "domain",
        desc: true,
      },
      {
        id: "id",
        desc: true,
      },
    ],
    !isGroupPage,
  );

  const zonesWithGroups = useMemo(() => {
    return (
      data?.map((zone) => {
        return {
          ...zone,
          groups_search: groups
            ?.map((g) =>
              zone?.distribution_groups?.includes(g?.id ?? "") ? g.name : "",
            )
            .join(""),
        } as DNSZone;
      }) ?? []
    );
  }, [data, groups]);

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading}
      text={t("zones.tableTitle")}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={zonesWithGroups}
      useRowId={true}
      wrapperComponent={isGroupPage ? Card : undefined}
      wrapperProps={isGroupPage ? { className: "mt-6 w-full" } : undefined}
      paginationPaddingClassName={isGroupPage ? "px-0 pt-8" : undefined}
      tableClassName={isGroupPage ? "mt-0 mb-2" : undefined}
      inset={false}
      minimal={isGroupPage}
      keepStateInLocalStorage={!isGroupPage}
      searchPlaceholder={t("zones.searchPlaceholder")}
      columnVisibility={{ searchString: false }}
      renderExpandedRow={(zone) => {
        const hasRecords = (zone?.records?.length ?? 0) > 0;
        if (!hasRecords) return;
        return (
          <>
            <DNSRecordsTable zone={zone} />
            <div className={"h-2 w-full bg-nb-gray-960"}></div>
          </>
        );
      }}
      getStartedCard={
        isGroupPage ? (
          <NoResults
            icon={<DNSZoneIcon className={"fill-nb-gray-200"} size={24} />}
            className={"py-4"}
            contentClassName={"max-w-lg"}
            title={t("zones.emptyGroupTitle")}
            description={t("zones.emptyGroupDescription")}
          >
            <div className={"gap-x-4 flex items-center justify-center mt-4"}>
              <AddZoneButton distributionGroups={distributionGroups} />
            </div>
          </NoResults>
        ) : (
          <GetStartedTest
            icon={
              <SquareIcon
                icon={<DNSZoneIcon className={"fill-nb-gray-200"} size={24} />}
                color={"gray"}
                size={"large"}
              />
            }
            title={t("zones.emptyTitle")}
            description={t("zones.emptyDescription")}
            button={
              <div className={"gap-x-4 flex items-center justify-center"}>
                <AddZoneButton distributionGroups={distributionGroups} />
              </div>
            }
            learnMore={
              <>
                {t("common.learnMorePrefix")}
                <InlineLink href={DNS_ZONE_DOCS_LINK} target={"_blank"}>
                  {t("zones.learnMoreLink")}
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </>
            }
          />
        )
      }
      rightSide={() => (
        <>
          {data && data.length > 0 && (
            <div className={"gap-x-4 ml-auto flex"}>
              <AddZoneButton distributionGroups={distributionGroups} />
            </div>
          )}
        </>
      )}
    >
      {(table) => (
        <>
          <ButtonGroup disabled={data?.length == 0}>
            <ButtonGroup.Button
              onClick={() => {
                table.setPageIndex(0);
                table.getColumn("enabled")?.setFilterValue(undefined);
              }}
              disabled={data?.length == 0}
              variant={
                table.getColumn("enabled")?.getFilterValue() === undefined
                  ? "tertiary"
                  : "secondary"
              }
            >
              {t("filters.all")}
            </ButtonGroup.Button>
            <ButtonGroup.Button
              onClick={() => {
                table.setPageIndex(0);
                table.getColumn("enabled")?.setFilterValue(true);
              }}
              disabled={data?.length == 0}
              variant={
                table.getColumn("enabled")?.getFilterValue() === true
                  ? "tertiary"
                  : "secondary"
              }
            >
              {t("table.active")}
            </ButtonGroup.Button>
            <ButtonGroup.Button
              onClick={() => {
                table.setPageIndex(0);
                table.getColumn("enabled")?.setFilterValue(false);
              }}
              disabled={data?.length == 0}
              variant={
                table.getColumn("enabled")?.getFilterValue() === false
                  ? "tertiary"
                  : "secondary"
              }
            >
              {t("accessPolicies.inactive")}
            </ButtonGroup.Button>
          </ButtonGroup>
          <DataTableRowsPerPage table={table} disabled={data?.length == 0} />
          <DataTableRefreshButton
            isDisabled={data?.length == 0}
            onClick={() => {
              mutate("/dns/zones").then();
              mutate("/groups").then();
            }}
          />
        </>
      )}
    </DataTable>
  );
}

type AddZoneButtonProps = {
  distributionGroups?: Group[];
};

const AddZoneButton = ({ distributionGroups }: AddZoneButtonProps) => {
  const { permission } = usePermissions();
  const { openZoneModal } = useDNSZones();
  const { t } = useI18n();

  return (
    <Button
      variant={"primary"}
      className={""}
      disabled={!permission?.dns?.create}
      onClick={() => openZoneModal(undefined, distributionGroups)}
    >
      <PlusCircle size={16} />
      {t("zones.add")}
    </Button>
  );
};
