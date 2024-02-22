import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import { useLocalStorage } from "@hooks/useLocalStorage";
import { IconCirclePlus } from "@tabler/icons-react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { Policy } from "@/interfaces/Policy";
import { PostureCheck } from "@/interfaces/PostureCheck";
import PostureCheckModal from "@/modules/posture-checks/modal/PostureCheckModal";
import { PostureCheckActionCell } from "@/modules/posture-checks/table/cells/PostureCheckActionCell";
import { PostureCheckChecksCell } from "@/modules/posture-checks/table/cells/PostureCheckChecksCell";
import { PostureCheckNameCell } from "@/modules/posture-checks/table/cells/PostureCheckNameCell";
import { PostureCheckPolicyUsageCell } from "@/modules/posture-checks/table/cells/PostureCheckPolicyUsageCell";

type Props = {
  isLoading: boolean;
  postureChecks: PostureCheck[] | undefined;
};

const Columns: ColumnDef<PostureCheck>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
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
      return <DataTableHeader column={column}>Checks</DataTableHeader>;
    },
    cell: ({ row }) => <PostureCheckChecksCell check={row.original} />,
  },
  {
    id: "access_control_usage",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Used by</DataTableHeader>;
    },
    cell: ({ row }) => <PostureCheckPolicyUsageCell check={row.original} />,
  },

  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <PostureCheckActionCell check={row.original} />,
  },
];

export default function PostureCheckTable({ postureChecks, isLoading }: Props) {
  const { data: policies } = useFetchApi<Policy[]>("/policies");
  const { mutate } = useSWRConfig();
  const path = usePathname();

  const data = useMemo(() => {
    if (!postureChecks) return [];
    return postureChecks?.map((check) => {
      const checkId = check.id;
      if (!policies) return check;
      const usage = policies?.filter((policy) => {
        if (!policy.source_posture_checks) return false;
        return policy.source_posture_checks.includes(checkId);
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

  return (
    <div className={""}>
      {postureCheckModal && (
        <PostureCheckModal
          open={postureCheckModal}
          key={currentRow ? 1 : 0}
          onOpenChange={setPostureCheckModal}
          postureCheck={currentRow}
        />
      )}

      <DataTable
        isLoading={isLoading}
        text={"Posture Check"}
        sorting={sorting}
        wrapperClassName={""}
        setSorting={setSorting}
        columns={Columns}
        showHeader={true}
        columnVisibility={{
          active: false,
        }}
        onRowClick={(row, cell) => {
          setCurrentRow(row.original);
          setPostureCheckModal(true);
          setCurrentCellClicked(cell);
        }}
        data={data}
        searchPlaceholder={"Search by name and description..."}
        rightSide={() => (
          <>
            {data && data?.length > 0 && (
              <Button
                variant={"primary"}
                className={"ml-auto"}
                onClick={() => {
                  setCurrentRow(undefined);
                  setPostureCheckModal(true);
                }}
              >
                <IconCirclePlus size={16} />
                Add Posture Check
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
            title={"Create Posture Check"}
            description={
              "Add posture checks to further restrict access in your network. E.g., only clients with a specific NetBird client version, operating system or location are allowed to connect."
            }
            button={
              <Button
                variant={"primary"}
                className={"ml-auto"}
                onClick={() => setPostureCheckModal(true)}
              >
                <IconCirclePlus size={16} />
                Create Posture Check
              </Button>
            }
            learnMore={
              <>
                Learn more about
                <InlineLink href={"https://docs.netbird.io/how-to/manage-posture-checks"} target={"_blank"}>
                  Posture Checks
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
              <ButtonGroup disabled={data?.length == 0}>
                <ButtonGroup.Button
                  onClick={() => {
                    table.setPageIndex(0);
                    table.getColumn("active")?.setFilterValue(true);
                  }}
                  disabled={data?.length == 0}
                  variant={
                    table.getColumn("active")?.getFilterValue() == true
                      ? "tertiary"
                      : "secondary"
                  }
                >
                  Active
                </ButtonGroup.Button>
                <ButtonGroup.Button
                  onClick={() => {
                    table.setPageIndex(0);
                    table.getColumn("active")?.setFilterValue("");
                  }}
                  disabled={data?.length == 0}
                  variant={
                    table.getColumn("active")?.getFilterValue() != true
                      ? "tertiary"
                      : "secondary"
                  }
                >
                  All
                </ButtonGroup.Button>
              </ButtonGroup>
              <DataTableRowsPerPage
                table={table}
                disabled={data?.length == 0}
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
    </div>
  );
}
