"use client";

import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
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
import { useI18n } from "@/i18n/I18nProvider";
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

function useNetworkTableColumns(): ColumnDef<Network>[] {
  const { t } = useI18n();

  return useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("networks.title")}</DataTableHeader>
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
          return <DataTableHeader column={column}>{t("groups.tooltip.networkResources")}</DataTableHeader>;
        },
        cell: ({ row }) => <NetworkResourceCell network={row.original} />,
      },
      {
        accessorKey: "policies",
        accessorFn: (network) => network?.policies?.length,
        header: ({ column }) => {
          return <DataTableHeader column={column}>{t("groups.tooltip.policies")}</DataTableHeader>;
        },
        cell: ({ row }) => <NetworkPolicyCell network={row.original} />,
      },
      {
        accessorKey: "routers",
        accessorFn: (network) => network?.routers?.length,
        header: ({ column }) => {
          return <DataTableHeader column={column}>{t("networks.routingPeers")}</DataTableHeader>;
        },
        cell: ({ row }) => <NetworkRoutingPeerCell network={row.original} />,
      },
      {
        accessorKey: "id",
        header: "",
        cell: ({ row }) => <NetworkActionCell network={row.original} />,
      },
    ],
    [t],
  );
}

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
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const [searchModal, setSearchModal] = useState(false);
  const { t } = useI18n();
  const columns = useNetworkTableColumns();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "name",
        desc: false,
      },
    ],
  );

  return (
    <>
      <GlobalSearchModal open={searchModal} setOpen={setSearchModal} />
      <NetworkAccessControlProvider>
        <NetworkProvider>
          <DataTable
            headingTarget={headingTarget}
            isLoading={isLoading}
            text={t("networks.title")}
            sorting={sorting}
            setSorting={setSorting}
            columns={columns}
            data={data}
            searchPlaceholder={t("networks.searchPlaceholder")}
            columnVisibility={{
              description: false,
            }}
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
                title={t("networks.emptyTitle")}
                description={t("networks.emptyDescription")}
                button={
                  <div className={"gap-x-4 flex items-center justify-center"}>
                    <AddNetworkButton />
                  </div>
                }
                learnMore={
                  <>
                    {t("common.learnMorePrefix")}{" "}
                    <InlineLink
                      href={"https://docs.netbird.io/how-to/networks"}
                      target={"_blank"}
                    >
                      {t("networks.title")}
                      <ExternalLinkIcon size={12} />
                    </InlineLink>
                  </>
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
                <DataTableRowsPerPage
                  table={table}
                  disabled={data?.length == 0}
                />
                <DataTableRefreshButton
                  isDisabled={data?.length == 0}
                  onClick={() => {
                    mutate("/networks").then();
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
  const { permission } = usePermissions();
  const { openCreateNetworkModal } = useNetworksContext();
  const { t } = useI18n();

  return (
    <Button
      variant={"primary"}
      onClick={openCreateNetworkModal}
      disabled={!permission.networks.create}
    >
      <PlusCircle size={16} />
      {t("networks.addNetwork")}
    </Button>
  );
};
