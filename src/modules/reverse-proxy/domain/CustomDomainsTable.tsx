"use client";

import Badge from "@components/Badge";
import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import CopyToClipboardText from "@components/CopyToClipboardText";
import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import {
  ExternalLinkIcon,
  GlobeIcon,
  HelpCircle,
  PlusCircle,
  ShieldCheckIcon,
  Trash2,
} from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useI18n } from "@/i18n/I18nProvider";
import {
  REVERSE_PROXY_DOCS_LINK,
  ReverseProxyDomain,
  ReverseProxyDomainType,
} from "@/interfaces/ReverseProxy";
import CustomDomainClusterCell from "@/modules/reverse-proxy/domain/CustomDomainClusterCell";
import { CustomDomainModal } from "./CustomDomainModal";
import { CustomDomainVerificationModal } from "./CustomDomainVerificationModal";

function useCustomDomainsColumns() {
  const { t } = useI18n();

  return useMemo<ColumnDef<ReverseProxyDomain>[]>(
    () => [
      {
        accessorKey: "domain",
        header: ({ column }) => {
          return <DataTableHeader column={column}>{t("reverseProxy.domain")}</DataTableHeader>;
        },
        sortingFn: "text",
        cell: ({ row }) => <CustomDomainNameCell domain={row.original} />,
      },
      {
        accessorKey: "validated",
        header: ({ column }) => {
          return <DataTableHeader column={column}>{t("table.status")}</DataTableHeader>;
        },
        filterFn: "exactMatch",
        cell: ({ row }) => <CustomDomainStatusCell domain={row.original} />,
      },
      {
        accessorKey: "target_cluster",
        header: ({ column }) => {
          return <DataTableHeader column={column}>{t("reverseProxy.cluster")}</DataTableHeader>;
        },
        cell: ({ row }) => <CustomDomainClusterCell domain={row.original} />,
      },
      {
        accessorKey: "id",
        header: "",
        cell: ({ row }) => <CustomDomainActionCell domain={row.original} />,
      },
      {
        id: "searchString",
        accessorFn: (row) => row.domain,
      },
    ],
    [t],
  );
}

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function CustomDomainsTable({ headingTarget }: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { domains, isLoadingDomains, createDomain, validateDomain } =
    useReverseProxies();
  const { t } = useI18n();
  const columns = useCustomDomainsColumns();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] =
    useState<ReverseProxyDomain | null>(null);
  const [selectedTargetCluster, setSelectedTargetCluster] = useState("");

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "domain",
        desc: false,
      },
    ],
  );

  const data = useMemo(() => {
    if (!domains) return [];
    return domains.filter((d) => d.type !== ReverseProxyDomainType.FREE);
  }, [domains]);

  return (
    <>
      <CustomDomainModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onDomainSubmit={async (domainName, targetCluster) => {
          createDomain(domainName, targetCluster).then((d) => {
            setSelectedDomain(d);
            setSelectedTargetCluster(targetCluster);
            setAddModalOpen(false);
            setVerificationModalOpen(true);
          });
        }}
        key={addModalOpen ? 1 : 0}
      />

      {selectedDomain && (
        <CustomDomainVerificationModal
          open={verificationModalOpen}
          onOpenChange={setVerificationModalOpen}
          domain={selectedDomain}
          onStartVerification={(d) => validateDomain(d.id)}
          targetCluster={selectedTargetCluster}
        />
      )}

      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoadingDomains}
        inset={false}
        initialPageSize={10000}
        keepStateInLocalStorage={false}
        text={t("reverseProxy.customDomainsTitle")}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={data}
        useRowId={true}
        searchPlaceholder={t("reverseProxy.customDomainsSearch")}
        columnVisibility={{ searchString: false }}
        getStartedCard={
          <GetStartedTest
            icon={
              <SquareIcon
                icon={<GlobeIcon className={"fill-nb-gray-200"} size={20} />}
                color={"gray"}
                size={"large"}
              />
            }
            title={t("reverseProxy.customDomainsEmptyTitle")}
            description={t("reverseProxy.customDomainsEmptyDescription")}
            button={
              <Button
                variant={"primary"}
                className={""}
                onClick={() => setAddModalOpen(true)}
                disabled={!permission?.services?.create}
              >
                <PlusCircle size={16} />
                {t("reverseProxy.addDomain")}
              </Button>
            }
            learnMore={
              <>
                {t("common.learnMorePrefix")}
                <InlineLink href={REVERSE_PROXY_DOCS_LINK} target={"_blank"}>
                  {t("reverseProxy.customDomainsLearnMore")}
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </>
            }
          />
        }
        rightSide={() => (
          <>
            {data && data.length > 0 && (
              <Button
                variant={"primary"}
                className={"ml-auto"}
                onClick={() => setAddModalOpen(true)}
                disabled={!permission?.services?.create}
              >
                <PlusCircle size={16} />
                {t("reverseProxy.addDomain")}
              </Button>
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
                  table.getColumn("validated")?.setFilterValue(undefined);
                }}
                disabled={data?.length == 0}
                variant={
                  table.getColumn("validated")?.getFilterValue() === undefined
                    ? "tertiary"
                    : "secondary"
                }
              >
                {t("filters.all")}
              </ButtonGroup.Button>
              <ButtonGroup.Button
                onClick={() => {
                  table.setPageIndex(0);
                  table.getColumn("validated")?.setFilterValue(false);
                }}
                disabled={data?.length == 0}
                variant={
                  table.getColumn("validated")?.getFilterValue() === false
                    ? "tertiary"
                    : "secondary"
                }
              >
                {t("reverseProxy.pending")}
              </ButtonGroup.Button>
              <ButtonGroup.Button
                onClick={() => {
                  table.setPageIndex(0);
                  table.getColumn("validated")?.setFilterValue(true);
                }}
                disabled={data?.length == 0}
                variant={
                  table.getColumn("validated")?.getFilterValue() === true
                    ? "tertiary"
                    : "secondary"
                }
              >
                {t("table.active")}
              </ButtonGroup.Button>
            </ButtonGroup>
            <DataTableRefreshButton
              isDisabled={data?.length == 0}
              onClick={() => {
                mutate("/reverse-proxies/domains").then();
              }}
            />
          </>
        )}
      </DataTable>
    </>
  );
}

type CellProps = {
  domain: ReverseProxyDomain;
};

function CustomDomainNameCell({ domain }: Readonly<CellProps>) {
  return (
    <div className="flex items-center gap-2 ml-2">
      <GlobeIcon size={14} className="text-nb-gray-200" />
      <CopyToClipboardText>
        <span className="font-medium">{domain.domain}</span>
      </CopyToClipboardText>
    </div>
  );
}

function CustomDomainStatusCell({ domain }: Readonly<CellProps>) {
  const { permission } = usePermissions();
  const { validateDomain } = useReverseProxies();
  const { t } = useI18n();
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const isValidated = domain.validated;

  if (isValidated) {
    return (
      <div className={cn("flex gap-2.5 items-center text-nb-gray-300 text-sm")}>
        <span className="h-2 w-2 rounded-full bg-green-500"></span>
        {t("table.active")}
      </div>
    );
  }

  return (
    <>
      <div
        className={cn("flex gap-4 items-center text-sm")}
        onClick={(e) => e.stopPropagation()}
      >
        <FullTooltip
          content={
            <div className={"text-xs max-w-xs"}>
              {t("reverseProxy.pendingVerificationHelp")}
            </div>
          }
          interactive={false}
        >
          <Badge variant={"yellow"} className={"cursor-help"}>
            {t("reverseProxy.pendingVerification")}
            <HelpCircle size={12} />
          </Badge>
        </FullTooltip>
        <Button
          variant={"secondary"}
          size={"xs"}
          className={"!px-3"}
          onClick={() => setVerificationModalOpen(true)}
          disabled={!permission?.services?.update}
        >
          <ShieldCheckIcon size={14} />
          {t("reverseProxy.verifyDomain")}
        </Button>
      </div>

      <CustomDomainVerificationModal
        open={verificationModalOpen}
        onOpenChange={setVerificationModalOpen}
        domain={domain}
        onStartVerification={(d) => validateDomain(d.id)}
        targetCluster={domain.target_cluster}
      />
    </>
  );
}

function CustomDomainActionCell({ domain }: Readonly<CellProps>) {
  const { permission } = usePermissions();
  const { deleteDomain } = useReverseProxies();
  const { t } = useI18n();

  return (
    <div
      className={"flex justify-end pr-4"}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        variant={"danger-outline"}
        size={"sm"}
        onClick={() => deleteDomain(domain)}
        disabled={!permission?.services?.delete}
      >
        <Trash2 size={16} />
        {t("actions.delete")}
      </Button>
    </div>
  );
}
