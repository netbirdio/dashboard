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
import { useLocalStorage } from "@hooks/useLocalStorage";
import { IconCirclePlus } from "@tabler/icons-react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useTranslations } from "next-intl";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Policy } from "@/interfaces/Policy";
import { PostureCheck } from "@/interfaces/PostureCheck";
import { LockedFeatureInfoCard } from "@/modules/billing/locked-feature/LockedFeatureInfoCard";
import { LockedFeatureOverlay } from "@/modules/billing/locked-feature/LockedFeatureOverlay";
import { NetworkProvider } from "@/modules/networks/NetworkProvider";
import PostureCheckModal from "@/modules/posture-checks/modal/PostureCheckModal";
import { PostureCheckActionCell } from "@/modules/posture-checks/table/cells/PostureCheckActionCell";
import { PostureCheckChecksCell } from "@/modules/posture-checks/table/cells/PostureCheckChecksCell";
import { PostureCheckNameCell } from "@/modules/posture-checks/table/cells/PostureCheckNameCell";
import { PostureCheckPolicyUsageCell } from "@/modules/posture-checks/table/cells/PostureCheckPolicyUsageCell";
import PoliciesProvider from "@/contexts/PoliciesProvider";

type Props = {
  isLoading: boolean;
  postureChecks: PostureCheck[] | undefined;
  headingTarget?: HTMLHeadingElement | null;
};

const Columns: ColumnDef<PostureCheck>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      const tCommon = useTranslations("common");
      return <DataTableHeader column={column}>{tCommon("name")}</DataTableHeader>;
    },
    cell: ({ row }) => <PostureCheckNameCell check={row.original} />,
  },
  {
    id: "active",
    accessorKey: "active",
    sortingFn: "basic",
  },
  {
    id: "checks",
    accessorFn: (row) => Object.keys(row.checks).length,
    header: ({ column }) => {
      const t = useTranslations("postureChecks");
      return <DataTableHeader column={column}>{t("checks")}</DataTableHeader>;
    },
    cell: ({ row }) => <PostureCheckChecksCell check={row.original} />,
  },
  {
    id: "access_control_usage",
    header: ({ column }) => {
      const tCommon = useTranslations("common");
      return <DataTableHeader column={column}>{tCommon("policies")}</DataTableHeader>;
    },
    cell: ({ row }) => <PostureCheckPolicyUsageCell check={row.original} />,
  },

  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <PostureCheckActionCell check={row.original} />,
  },
];

export default function PostureCheckTable({
  postureChecks,
  isLoading,
  headingTarget,
}: Props) {
  const { permission } = usePermissions();
  const { data: policies } = useFetchApi<Policy[]>("/policies");
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const t = useTranslations("postureChecks");
  const tCommon = useTranslations("common");

  const data = useMemo(() => {
    if (!postureChecks) return [];
    return postureChecks?.map((check) => {
      const checkId = check.id;
      if (!policies) return check;
      const usage = policies?.filter((policy) => {
        if (!policy.source_posture_checks) return false;
        let checks = policy.source_posture_checks as string[];
        return checks.includes(checkId);
      });
      const isOnePolicyEnabled = usage.some((policy) => policy.enabled);
      return {
        ...check,
        policies: usage || [],
        active: isOnePolicyEnabled,
      };
    });
  }, [postureChecks, policies]);

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "active",
        desc: true,
      },
    ],
  );

  const [postureCheckModal, setPostureCheckModal] = useState(false);
  const [currentRow, setCurrentRow] = useState<PostureCheck>();
  const [, setCurrentCellClicked] = useState("");

  const statusOptions = useMemo<RadioOption<boolean | undefined>[]>(
    () => [
      { value: undefined, label: tCommon("all"), dotClass: "bg-nb-gray-500" },
      { value: true, label: tCommon("active"), dotClass: "bg-green-500" },
      { value: false, label: tCommon("inactive"), dotClass: "bg-nb-gray-700" },
    ],
    [tCommon],
  );

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: "active",
        label: tCommon("status"),
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
    [statusOptions, tCommon],
  );

  return (
    <div className={""}>
      {postureCheckModal && (
        <PostureCheckModal
          open={postureCheckModal}
          key={currentRow ? 1 : 0}
          onOpenChange={setPostureCheckModal}
          onSuccess={() => setPostureCheckModal(false)}
          postureCheck={currentRow}
        />
      )}

      <LockedFeatureInfoCard
        className={"px-4 sm:px-6 md:px-8 mt-0 mb-8"}
        featureText={t("title")}
        feature={"POSTURE_CHECKS"}
      />

      <LockedFeatureOverlay
        opacity={data?.length > 0 ? 35 : 60}
        feature={"POSTURE_CHECKS"}
      >
        <PoliciesProvider>
          <DataTable
            headingTarget={headingTarget}
            isLoading={isLoading}
            text={t("postureCheck")}
            sorting={sorting}
            wrapperClassName={""}
            setSorting={setSorting}
            columns={Columns}
            showHeader={true}
            initialPageSize={25}
            showResetFilterButton={false}
            columnVisibility={{
              active: false,
            }}
            aboveTable={(table) => (
              <TableFilterChips table={table} filters={filterDefs} />
            )}
            onRowClick={(row, cell) => {
              setCurrentRow(row.original);
              setPostureCheckModal(true);
              setCurrentCellClicked(cell);
            }}
            data={data}
            searchPlaceholder={t("searchByNameAndDescription")}
            rightSide={() => (
              <>
                {data && data?.length > 0 && (
                  <Button
                    variant={"primary"}
                    className={"ml-auto"}
                    disabled={
                      !permission.policies.create || !permission.policies.update
                    }
                    onClick={() => {
                      setCurrentRow(undefined);
                      setPostureCheckModal(true);
                    }}
                  >
                    <IconCirclePlus size={16} />
                    {t("newPostureCheck")}
                  </Button>
                )}
              </>
            )}
            getStartedCard={
              <GetStartedTest
                icon={
                  <SquareIcon
                    icon={<ShieldCheck size={23} />}
                    color={"gray"}
                    size={"large"}
                  />
                }
                title={t("createPostureCheck")}
                description={t("noChecksDescription")}
                button={
                  <Button
                    variant={"primary"}
                    className={"ml-auto"}
                    disabled={
                      !permission.policies.create || !permission.policies.update
                    }
                    onClick={() => setPostureCheckModal(true)}
                  >
                    <IconCirclePlus size={16} />
                    {t("createPostureCheck")}
                  </Button>
                }
                learnMore={
                  <>
                    {t("learnMoreAbout")}
                    <InlineLink
                      href={
                        "https://docs.netbird.io/how-to/manage-posture-checks"
                      }
                      target={"_blank"}
                    >
                      {t("title")}
                      <ExternalLinkIcon size={12} />
                    </InlineLink>
                  </>
                }
              />
            }
          >
            {(table) => {
              return (
                <>
                  <TableFiltersButton
                    table={table}
                    filters={filterDefs}
                    disabled={data?.length == 0}
                  />
                  <DataTableResetFilterButton
                    table={table}
                    onClick={() => {
                      table.setPageIndex(0);
                      table.resetColumnFilters();
                      table.resetGlobalFilter();
                    }}
                  />
                  <DataTableRefreshButton
                    isDisabled={data?.length == 0}
                    onClick={() => {
                      mutate("/posture-checks");
                    }}
                  />
                </>
              );
            }}
          </DataTable>
        </PoliciesProvider>
      </LockedFeatureOverlay>
    </div>
  );
}
