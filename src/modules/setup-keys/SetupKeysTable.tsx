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
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import SetupKeysIcon from "@/assets/icons/SetupKeysIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useI18n } from "@/i18n/I18nProvider";
import { Group } from "@/interfaces/Group";
import { SetupKey } from "@/interfaces/SetupKey";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";
import ExpirationDateRow from "@/modules/common-table-rows/ExpirationDateRow";
import LastTimeRow from "@/modules/common-table-rows/LastTimeRow";
import SetupKeyActionCell from "@/modules/setup-keys/SetupKeyActionCell";
import SetupKeyGroupsCell from "@/modules/setup-keys/SetupKeyGroupsCell";
import SetupKeyModal from "@/modules/setup-keys/SetupKeyModal";
import SetupKeyNameCell from "@/modules/setup-keys/SetupKeyNameCell";
import SetupKeyStatusCell from "@/modules/setup-keys/SetupKeyStatusCell";
import SetupKeyUsageCell from "@/modules/setup-keys/SetupKeyUsageCell";

function useSetupKeysTableColumns(): ColumnDef<SetupKey>[] {
  const { t } = useI18n();

  return useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => {
          return (
            <DataTableHeader column={column}>{t("table.nameAndKey")}</DataTableHeader>
          );
        },
        sortingFn: "text",
        cell: ({ row }) => (
          <SetupKeyNameCell
            name={row.original.name}
            valid={row.original.valid}
            secret={row.original.key}
          />
        ),
      },
      {
        id: "valid",
        accessorKey: "valid",
        sortingFn: "basic",
      },
      {
        accessorKey: "usage_limit",
        header: ({ column }) => {
          return <DataTableHeader column={column}>{t("table.usage")}</DataTableHeader>;
        },
        cell: ({ row }) => (
          <SetupKeyUsageCell
            current={row.original.used_times}
            limit={row.original.usage_limit || 0}
            reusable={row.original.type == "reusable"}
          />
        ),
      },
      {
        accessorKey: "last_used",
        header: ({ column }) => {
          return <DataTableHeader column={column}>{t("table.lastUsed")}</DataTableHeader>;
        },
        sortingFn: "datetime",
        cell: ({ row }) => (
          <LastTimeRow date={row.original.last_used} text={t("setupKeys.lastUsedOn")} />
        ),
      },
      {
        id: "group_strings",
        accessorKey: "group_strings",
        accessorFn: (s) => s.groups?.map((g) => g?.name || "").join(", "),
      },
      {
        accessorFn: (item) => item.auto_groups?.length,
        id: "groups",
        header: ({ column }) => {
          return <DataTableHeader column={column}>{t("table.groups")}</DataTableHeader>;
        },
        cell: ({ row }) => <SetupKeyGroupsCell setupKey={row.original} />,
      },
      {
        accessorKey: "expires",
        header: ({ column }) => {
          return <DataTableHeader column={column}>{t("table.expires")}</DataTableHeader>;
        },
        cell: ({ row }) => {
          const expires = dayjs(row.original.expires);
          const isNeverExpiring = expires?.year() == 1 || false;
          return !isNeverExpiring ? (
            <ExpirationDateRow date={row.original.expires} />
          ) : (
            <EmptyRow className={"px-3"} />
          );
        },
      },
      {
        id: "status",
        accessorKey: "id",
        header: ({ column }) => "",
        cell: ({ row }) => <SetupKeyStatusCell setupKey={row.original} />,
      },
      {
        accessorKey: "id",
        header: "",
        cell: ({ row }) => {
          return <SetupKeyActionCell setupKey={row.original} />;
        },
      },
    ],
    [t],
  );
}

type Props = {
  setupKeys?: SetupKey[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
  isGroupPage?: boolean;
  groups?: Group[];
};

export default function SetupKeysTable({
  setupKeys,
  isLoading,
  headingTarget,
  isGroupPage,
  groups,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { t } = useI18n();
  const columns = useSetupKeysTableColumns();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "valid",
        desc: true,
      },
      {
        id: "last_used",
        desc: true,
      },
      {
        id: "name",
        desc: true,
      },
    ],
    !isGroupPage,
  );

  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <SetupKeyModal open={open} setOpen={setOpen} groups={groups} />}
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        wrapperComponent={isGroupPage ? Card : undefined}
        wrapperProps={isGroupPage ? { className: "mt-6 w-full" } : undefined}
        paginationPaddingClassName={isGroupPage ? "px-0 pt-8" : undefined}
        tableClassName={isGroupPage ? "mt-0 mb-2" : undefined}
        inset={false}
        minimal={isGroupPage}
        keepStateInLocalStorage={!isGroupPage}
        text={t("setupKeys.title")}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={setupKeys}
        searchPlaceholder={t("setupKeys.searchPlaceholder")}
        columnVisibility={{
          valid: false,
          group_strings: false,
        }}
        getStartedCard={
          isGroupPage ? (
            <NoResults
              icon={<SetupKeysIcon className={"fill-nb-gray-200"} size={20} />}
              className={"py-4"}
              title={t("setupKeys.groupEmptyTitle")}
              description={t("setupKeys.groupEmptyDescription")}
            >
              <Button
                variant={"primary"}
                className={"mt-4"}
                onClick={() => setOpen(true)}
                disabled={!permission.setup_keys.create}
              >
                <PlusCircle size={16} />
                {t("setupKeys.createTitle")}
              </Button>
            </NoResults>
          ) : (
            <GetStartedTest
              icon={
                <SquareIcon
                  icon={<SetupKeysIcon className={"fill-nb-gray-200"} size={20} />}
                  color={"gray"}
                  size={"large"}
                />
              }
              title={t("setupKeys.createTitle")}
              description={t("setupKeys.emptyDescription")}
              button={
                <Button
                  variant={"primary"}
                  className={""}
                  onClick={() => setOpen(true)}
                  disabled={!permission.setup_keys.create}
                >
                  <PlusCircle size={16} />
                  {t("setupKeys.createTitle")}
                </Button>
              }
              learnMore={
                <>
                  {t("common.learnMorePrefix")}{" "}
                  <InlineLink
                    href={
                      "https://docs.netbird.io/how-to/register-machines-using-setup-keys"
                    }
                    target={"_blank"}
                  >
                    {t("setupKeys.title")}
                    <ExternalLinkIcon size={12} />
                  </InlineLink>
                </>
              }
            />
          )
        }
        rightSide={() => (
          <>
            {setupKeys && setupKeys?.length > 0 && (
              <Button
                variant={"primary"}
                className={"ml-auto"}
                onClick={() => setOpen(true)}
                disabled={!permission.setup_keys.create}
              >
                <PlusCircle size={16} />
                {t("setupKeys.createTitle")}
              </Button>
            )}
          </>
        )}
      >
        {(table) => (
          <>
            <ButtonGroup disabled={setupKeys?.length == 0}>
              <ButtonGroup.Button
                onClick={() => {
                  table.setPageIndex(0);
                  table.getColumn("valid")?.setFilterValue(undefined);
                }}
                disabled={setupKeys?.length == 0}
                variant={
                  table.getColumn("valid")?.getFilterValue() == undefined
                    ? "tertiary"
                    : "secondary"
                }
              >
                {t("filters.all")}
              </ButtonGroup.Button>
              <ButtonGroup.Button
                onClick={() => {
                  table.setPageIndex(0);
                  table.getColumn("valid")?.setFilterValue(true);
                }}
                disabled={setupKeys?.length == 0}
                variant={
                  table.getColumn("valid")?.getFilterValue() == true
                    ? "tertiary"
                    : "secondary"
                }
              >
                {t("filters.valid")}
              </ButtonGroup.Button>
              <ButtonGroup.Button
                onClick={() => {
                  table.setPageIndex(0);
                  table.getColumn("valid")?.setFilterValue(false);
                }}
                disabled={setupKeys?.length == 0}
                variant={
                  table.getColumn("valid")?.getFilterValue() == false
                    ? "tertiary"
                    : "secondary"
                }
              >
                {t("filters.expired")}
              </ButtonGroup.Button>
            </ButtonGroup>
            <DataTableRowsPerPage
              table={table}
              disabled={setupKeys?.length == 0}
            />
            <DataTableRefreshButton
              isDisabled={setupKeys?.length == 0}
              onClick={() => {
                mutate("/setup-keys").then();
                mutate("/groups").then();
              }}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
