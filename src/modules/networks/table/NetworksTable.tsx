import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
import {
  formatRadioChip,
  RadioOption,
  RadioPicker,
} from "@components/table/filters/RadioPicker";
import {
  TableFilterChips,
  TableFilterDef,
  TableFiltersButton,
} from "@components/table/TableFilters";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Network } from "@/interfaces/Network";
import { NetworkAccessControlProvider } from "@/modules/networks/NetworkAccessControlProvider";
import {
  NetworkProvider,
  useNetworksContext,
} from "@/modules/networks/NetworkProvider";
import NetworkActionCell from "@/modules/networks/table/NetworkActionCell";
import NetworkNameCell from "@/modules/networks/table/NetworkNameCell";
import { NetworkPolicyCell } from "@/modules/networks/table/NetworkPolicyCell";
import { NetworkResourceCell } from "@/modules/networks/table/NetworkResourceCell";
import NetworkRoutingPeerCell from "@/modules/networks/table/NetworkRoutingPeerCell";
import { GlobalSearchModal } from "@/modules/search/GlobalSearchModal";

export const NetworkTableColumns: ColumnDef<Network>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableHeader column={column} labelId="common.network" />
    ),
    sortingFn: "text",
    cell: ({ row }) => <NetworkNameCell network={row.original} />,
  },
  {
    accessorKey: "description",
  },
  {
    accessorKey: "resources",
    accessorFn: (network) => network?.resources?.length,
    header: ({ column }) => {
      return <DataTableHeader column={column} labelId="common.resources" />;
    },
    cell: ({ row }) => <NetworkResourceCell network={row.original} />,
  },
  {
    accessorKey: "policies",
    accessorFn: (network) => network?.policies?.length,
    header: ({ column }) => {
      return <DataTableHeader column={column} labelId="common.policies" />;
    },
    cell: ({ row }) => <NetworkPolicyCell network={row.original} />,
  },
  {
    accessorKey: "routers",
    accessorFn: (network) => network?.routers?.length,
    header: ({ column }) => {
      return <DataTableHeader column={column} labelId="common.routingPeers" />;
    },
    cell: ({ row }) => <NetworkRoutingPeerCell network={row.original} />,
  },
  {
    id: "active",
    accessorFn: (network) => (network?.routing_peers_count ?? 0) > 0,
  },
  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <NetworkActionCell network={row.original} />,
  },
];

type Props = {
  data?: Network[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function NetworksTable({
  isLoading,
  data,
  headingTarget,
}: Readonly<Props>) {
  const translate = useTranslations();
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const [searchModal, setSearchModal] = useState(false);

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "name",
        desc: false,
      },
    ],
  );

  const statusOptions = useMemo<RadioOption<boolean | undefined>[]>(
    () => [
      {
        value: undefined,
        id: "all",
        label: translate("common.all"),
        dotClass: "bg-nb-gray-500",
      },
      {
        value: true,
        id: "active",
        label: translate("common.active"),
        dotClass: "bg-green-500",
      },
      {
        value: false,
        id: "inactive",
        label: translate("common.inactive"),
        dotClass: "bg-nb-gray-700",
      },
    ],
    [translate],
  );

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: "active",
        label: translate("common.status"),
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
    ],
    [statusOptions, translate],
  );

  return (
    <>
      <GlobalSearchModal open={searchModal} setOpen={setSearchModal} />
      <NetworkAccessControlProvider>
        <NetworkProvider>
          <DataTable
            headingTarget={headingTarget}
            isLoading={isLoading}
            text={translate("common.networks")}
            sorting={sorting}
            setSorting={setSorting}
            columns={NetworkTableColumns}
            data={data}
            initialPageSize={25}
            showResetFilterButton={false}
            searchPlaceholder={translate("networks.searchByNameOrDescription")}
            columnVisibility={{
              description: false,
              active: false,
            }}
            aboveTable={(table) => (
              <TableFilterChips table={table} filters={filterDefs} />
            )}
            onSearchClick={() => setSearchModal(true)}
            getStartedCard={
              <GetStartedTest
                icon={
                  <SquareIcon
                    icon={
                      <NetworkRoutesIcon
                        className={"fill-nb-gray-200"}
                        size={20}
                      />
                    }
                    color={"gray"}
                    size={"large"}
                  />
                }
                title={translate("networks.createNewNetwork")}
                description={translate("networks.noNetworksDescription")}
                button={
                  <div className={"gap-x-4 flex items-center justify-center"}>
                    <AddNetworkButton />
                  </div>
                }
                learnMore={
                  translate.rich("networks.learnMoreAboutNetworks", {
                    link: (chunks) => (
                      <InlineLink
                        href={"https://docs.netbird.io/how-to/networks"}
                        target={"_blank"}
                      >
                        {chunks}
                        <ExternalLinkIcon size={12} />
                      </InlineLink>
                    ),
                  })
                }
              />
            }
            rightSide={() =>
              data &&
              data.length > 0 && (
                <div className={cn("gap-x-4 ml-auto flex")}>
                  <AddNetworkButton />
                </div>
              )
            }
          >
            {(table) => (
              <>
                <TableFiltersButton
                  table={table}
                  filters={filterDefs}
                  disabled={data?.length == 0}
                />
                <DataTableRefreshButton
                  isDisabled={data?.length == 0}
                  onClick={() => {
                    mutate("/networks").then();
                  }}
                />
                <DataTableResetFilterButton
                  table={table}
                  onClick={() => {
                    table.setPageIndex(0);
                    table.resetColumnFilters();
                    table.resetGlobalFilter();
                  }}
                />
              </>
            )}
          </DataTable>
        </NetworkProvider>
      </NetworkAccessControlProvider>
    </>
  );
}

const AddNetworkButton = () => {
  const t = useTranslations();
  const { permission } = usePermissions();

  const { openCreateNetworkModal } = useNetworksContext();
  return (
    <Button
      variant={"primary"}
      onClick={openCreateNetworkModal}
      disabled={!permission.networks.create}
      data-testid={"add-network"}
    >
      <PlusCircle size={16} />
      {t("common.addNetwork")}
    </Button>
  );
};
