import Button from "@components/Button";
import Card from "@components/Card";
import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
import {
  CheckboxListPicker,
  CheckboxOption,
  formatCheckboxChip,
} from "@components/table/filters/CheckboxListPicker";
import {
  formatGroupsChip,
  GroupsPicker,
} from "@components/table/filters/GroupsPicker";
import {
  formatRadioChip,
  RadioOption,
  RadioPicker,
} from "@components/table/filters/RadioPicker";
import {
  formatTextChip,
  TextInputPicker,
} from "@components/table/filters/TextInputPicker";
import {
  TableFilterChips,
  TableFilterDef,
  TableFiltersButton,
} from "@components/table/TableFilters";
import GetStartedTest from "@components/ui/GetStartedTest";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { removeAllSpaces } from "@utils/helpers";
import { ClockFadingIcon, ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import NoResults from "@/components/ui/NoResults";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Policy } from "@/interfaces/Policy";
import AccessControlModal, {
  AccessControlUpdateModal,
} from "@/modules/access-control/AccessControlModal";
import AccessControlActionCell from "@/modules/access-control/table/AccessControlActionCell";
import AccessControlDestinationsCell from "@/modules/access-control/table/AccessControlDestinationsCell";
import AccessControlDirectionCell from "@/modules/access-control/table/AccessControlDirectionCell";
import AccessControlNameCell from "@/modules/access-control/table/AccessControlNameCell";
import AccessControlProtoPortsCell from "@/modules/access-control/table/AccessControlProtoPortsCell";
import AccessControlSourcesCell from "@/modules/access-control/table/AccessControlSourcesCell";

type Props = {
  policies?: Policy[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
  isGroupPage?: boolean;
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
    id: "proto_ports",
    accessorFn: (row) => row.rules?.[0]?.protocol || "",
    sortingFn: "text",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Proto & Ports</DataTableHeader>;
    },
    cell: ({ cell }) => (
      <AccessControlProtoPortsCell policy={cell.row.original} />
    ),
  },
  {
    id: "id",
    accessorKey: "id",
    filterFn: "exactMatch",
  },
  // Hidden filter columns powering the consolidated Filters UI.
  {
    id: "source_group_names",
    accessorFn: (row) => {
      const sources = row.rules?.[0]?.sources;
      if (!sources) return [];
      return (sources as { name?: string }[])
        .map((s) => s?.name)
        .filter((n): n is string => !!n);
    },
    filterFn: "arrIncludesSome",
  },
  {
    id: "destination_group_names",
    accessorFn: (row) => {
      const destinations = row.rules?.[0]?.destinations;
      if (!destinations) return [];
      return (destinations as { name?: string }[])
        .map((d) => d?.name)
        .filter((n): n is string => !!n);
    },
    filterFn: "arrIncludesSome",
  },
  {
    id: "protocol_filter",
    accessorFn: (row) => [row.rules?.[0]?.protocol || "all"],
    filterFn: "arrIncludesSome",
  },
  {
    id: "ports_filter",
    accessorFn: (row) => {
      const rule = row.rules?.[0];
      const ports = rule?.ports || [];
      const ranges = (rule?.port_ranges || []).map(
        (r) => `${r.start}-${r.end}`,
      );
      return [...ports, ...ranges].join(" ");
    },
    filterFn: "includesString",
  },
  {
    id: "has_posture_checks",
    accessorFn: (row) =>
      (row.source_posture_checks?.length ?? 0) > 0 ? "with" : "without",
    filterFn: "equalsString",
  },
  {
    id: "direction_filter",
    accessorFn: (row) => !!row.rules?.[0]?.bidirectional,
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
  isGroupPage,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const params = useSearchParams();
  const idParam = !isGroupPage ? params.get("id") : undefined;

  // Default sorting state of the table
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

  // Single-radio status filter mirroring the previous All / Active /
  // Inactive ButtonGroup. Routed through the consolidated Filters UI.
  const statusOptions = useMemo<RadioOption<boolean | undefined>[]>(
    () => [
      { value: undefined, label: "All", dotClass: "bg-nb-gray-500" },
      { value: true, label: "Enabled", dotClass: "bg-green-500" },
      { value: false, label: "Disabled", dotClass: "bg-nb-gray-700" },
    ],
    [],
  );

  const protocolOptions = useMemo<CheckboxOption<string>[]>(
    () => [
      { value: "tcp", label: "TCP" },
      { value: "udp", label: "UDP" },
      { value: "icmp", label: "ICMP" },
      { value: "netbird-ssh", label: "NetBird SSH" },
    ],
    [],
  );

  const postureOptions = useMemo<RadioOption<string | undefined>[]>(
    () => [
      { value: undefined, label: "All" },
      { value: "with", label: "With" },
      { value: "without", label: "Without" },
    ],
    [],
  );

  const directionOptions = useMemo<RadioOption<boolean | undefined>[]>(
    () => [
      { value: undefined, label: "All" },
      { value: true, label: "Bidirectional" },
      { value: false, label: "One-way" },
    ],
    [],
  );

  // Groups derived from the current policies' sources + destinations,
  // so the Sources/Destinations filters only offer groups that actually
  // appear in the table.
  const tableGroups = useMemo(() => {
    if (!policies) return [];
    const map = new Map<string, { id?: string; name: string }>();
    for (const policy of policies) {
      const rule = policy.rules?.[0];
      if (!rule) continue;
      const both = [
        ...((rule.sources as { id?: string; name?: string }[] | null) ?? []),
        ...((rule.destinations as { id?: string; name?: string }[] | null) ??
          []),
      ];
      for (const g of both) {
        if (g?.name && !map.has(g.name)) {
          map.set(g.name, { id: g.id, name: g.name });
        }
      }
    }
    return Array.from(map.values());
  }, [policies]);

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: "enabled",
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
      {
        id: "source_group_names",
        label: "Sources",
        renderPicker: (p) => (
          <GroupsPicker
            value={p.value as string[] | undefined}
            onChange={p.onChange}
            close={p.close}
            groups={tableGroups}
          />
        ),
        formatChip: (v) => formatGroupsChip(v as string[] | undefined),
      },
      {
        id: "destination_group_names",
        label: "Destinations",
        renderPicker: (p) => (
          <GroupsPicker
            value={p.value as string[] | undefined}
            onChange={p.onChange}
            close={p.close}
            groups={tableGroups}
          />
        ),
        formatChip: (v) => formatGroupsChip(v as string[] | undefined),
      },
      {
        id: "direction_filter",
        label: "Direction",
        renderPicker: (p) => (
          <RadioPicker
            value={p.value as boolean | undefined}
            onChange={p.onChange}
            close={p.close}
            options={directionOptions}
          />
        ),
        formatChip: (v) =>
          formatRadioChip(v as boolean | undefined, directionOptions),
      },
      {
        id: "protocol_filter",
        label: "Protocol",
        renderPicker: (p) => (
          <CheckboxListPicker
            value={p.value as string[] | undefined}
            onChange={p.onChange}
            close={p.close}
            options={protocolOptions}
          />
        ),
        formatChip: (v) =>
          formatCheckboxChip(
            v as string[] | undefined,
            protocolOptions,
            "protocols",
          ),
      },
      {
        id: "ports_filter",
        label: "Port",
        renderPicker: (p) => (
          <TextInputPicker
            value={p.value as string | undefined}
            onChange={p.onChange}
            close={p.close}
            placeholder={"e.g. 443"}
          />
        ),
        formatChip: (v) => formatTextChip(v as string | undefined),
      },
      {
        id: "has_posture_checks",
        label: "Posture Checks",
        renderPicker: (p) => (
          <RadioPicker
            value={p.value as string | undefined}
            onChange={p.onChange}
            close={p.close}
            options={postureOptions}
          />
        ),
        formatChip: (v) =>
          formatRadioChip(v as string | undefined, postureOptions),
      },
    ],
    [
      statusOptions,
      protocolOptions,
      postureOptions,
      directionOptions,
      tableGroups,
    ],
  );

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
        wrapperComponent={isGroupPage ? Card : undefined}
        wrapperProps={isGroupPage ? { className: "mt-6 w-full" } : undefined}
        paginationPaddingClassName={isGroupPage ? "px-0 pt-8" : undefined}
        tableClassName={isGroupPage ? "mt-0 mb-2" : undefined}
        inset={false}
        minimal={isGroupPage}
        keepStateInLocalStorage={!isGroupPage || !idParam}
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
        initialPageSize={25}
        showResetFilterButton={false}
        columns={AccessControlTableColumns}
        aboveTable={(table) => (
          <TableFilterChips table={table} filters={filterDefs} />
        )}
        columnVisibility={{
          description: false,
          id: false,
          enabled: false,
          temporary: false,
          source_group_names: false,
          destination_group_names: false,
          protocol_filter: false,
          ports_filter: false,
          has_posture_checks: false,
          direction_filter: false,
        }}
        rowClassName={(row) => (row.original.enabled ? "" : "opacity-50")}
        data={showTemporaryPolicies ? tempPolicies : regularPolicies}
        onRowClick={(row, cell) => {
          setCurrentRow(row.original);
          setEditModal(true);
          setCurrentCellClicked(cell);
        }}
        searchPlaceholder={"Search by name and description..."}
        getStartedCard={
          isGroupPage ? (
            <NoResults
              className={"py-4"}
              title={"This group is not used within any policies yet"}
              description={
                "Assign this group as either a source or destination inside a policy to see them listed here."
              }
              icon={
                <AccessControlIcon size={20} className={"fill-nb-gray-300"} />
              }
            >
              <div className={"flex gap-4 items-center justify-center"}>
                <AccessControlModal>
                  <Button
                    variant={"primary"}
                    className={"mt-4"}
                    disabled={!permission.policies.create}
                  >
                    <PlusCircle size={16} />
                    Add Policy
                  </Button>
                </AccessControlModal>
              </div>
            </NoResults>
          ) : (
            <GetStartedTest
              icon={
                <SquareIcon
                  icon={
                    <AccessControlIcon
                      className={"fill-nb-gray-200"}
                      size={20}
                    />
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
                    href={
                      "https://docs.netbird.io/how-to/manage-network-access"
                    }
                    target={"_blank"}
                  >
                    Access Controls
                    <ExternalLinkIcon size={12} />
                  </InlineLink>
                </>
              }
            />
          )
        }
        rightSide={() => (
          <>
            {policies && policies?.length > 0 && (
              <div className={"flex items-center ml-auto"}>
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
              <TableFiltersButton
                table={table}
                filters={filterDefs}
                disabled={policies?.length == 0}
              />

              <DataTableResetFilterButton
                table={table}
                onClick={() => {
                  table.setPageIndex(0);
                  table.resetColumnFilters();
                  table.resetGlobalFilter();
                }}
              />

              {tempPolicies?.length > 0 && (
                <FullTooltip
                  content={
                    <div className={"max-w-sm text-xs"}>
                      Show temporary policies created by the NetBird browser
                      client. These policies are ephemeral and will be deleted
                      automatically after a short period of time.
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
