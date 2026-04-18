import Badge from "@components/Badge";
import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { notify } from "@components/Notification";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import NoResults from "@components/ui/NoResults";
import { useApiCall } from "@utils/api";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { IconCirclePlus } from "@tabler/icons-react";
import {
  Edit,
  MoreVertical,
  Power,
  PowerOff,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { InspectionPolicy } from "@/interfaces/Network";
import { InspectionPolicyModal } from "@/modules/networks/inspection/InspectionPolicyModal";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";
import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";

type Props = {
  policies: InspectionPolicy[];
  isLoading: boolean;
};

const InspectionPoliciesTable = ({ policies, isLoading }: Props) => {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<
    InspectionPolicy | undefined
  >();

  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);

  const columns: ColumnDef<InspectionPolicy>[] = useMemo(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableHeader column={column}>Name</DataTableHeader>
        ),
        sortingFn: "text",
        cell: ({ row }) => (
          <button
            className="text-left"
            onClick={() => {
              setEditingPolicy(row.original);
              setModalOpen(true);
            }}
          >
            <ActiveInactiveRow
              active={row.original.enabled}
              inactiveDot="gray"
              text={row.original.name}
            >
              <DescriptionWithTooltip
                className="mt-1"
                text={row.original.description ?? ""}
                maxChars={30}
              />
            </ActiveInactiveRow>
          </button>
        ),
      },
      {
        id: "rules",
        accessorKey: "rules",
        header: ({ column }) => (
          <DataTableHeader column={column}>Rules</DataTableHeader>
        ),
        cell: ({ row }) => {
          const rules = row.original.rules ?? [];
          const allDomains = rules.flatMap((r) => r.domains ?? []);
          return (
            <div className="flex items-center gap-2 flex-wrap">
              <div
                className="flex items-center gap-1.5 bg-nb-gray-900/80 border
                            border-nb-gray-800/50 py-1 rounded-full px-2.5 shrink-0"
              >
                <ShieldCheck size={12} className="text-netbird" />
                <span className="text-[11px] font-medium text-nb-gray-200">
                  {rules.length}
                </span>
              </div>
              {allDomains.slice(0, 3).map((d) => (
                <Badge key={d} variant="gray" className="text-[11px] font-mono">
                  {d}
                </Badge>
              ))}
              {allDomains.length > 3 && (
                <Badge variant="gray" className="text-[11px]">
                  +{allDomains.length - 3}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "default_action",
        accessorKey: "default_action",
        header: ({ column }) => (
          <DataTableHeader column={column}>Default</DataTableHeader>
        ),
        cell: ({ row }) => {
          const action = row.original.default_action ?? "allow";
          const variant =
            action === "block"
              ? "red"
              : action === "inspect"
                ? "yellow"
                : "green";
          return (
            <Badge variant={variant} className="text-xs capitalize">
              {action}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        accessorKey: "id",
        header: "",
        cell: ({ row }) => (
          <ActionsCell
            policy={row.original}
            onEdit={() => {
              setEditingPolicy(row.original);
              setModalOpen(true);
            }}
          />
        ),
      },
    ],
    [],
  );

  return (
    <>
      <DataTable
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={policies}
        searchPlaceholder={"Search by name and description..."}
        isLoading={isLoading}
        columnVisibility={{}}
        getStartedCard={
          <NoResults
            className={"py-4"}
            title={"Create your first inspection policy"}
            description={
              "Inspection policies define how traffic is inspected on transparent proxies. Create one and attach it to an access control policy."
            }
            icon={<ShieldCheck size={18} className={"text-nb-gray-400"} />}
          />
        }
        rightSide={() => (
          <>
            <DataTableRefreshButton
              onClick={() => mutate("/inspection-policies")}
            />
            {permission.policies.create && (
              <Button
                variant={"primary"}
                className={"ml-auto"}
                onClick={() => {
                  setEditingPolicy(undefined);
                  setModalOpen(true);
                }}
              >
                <IconCirclePlus size={16} />
                Add Inspection Policy
              </Button>
            )}
          </>
        )}
      >
        {(table) => (
          <DataTableRowsPerPage
            table={table}
            disabled={!policies || policies.length === 0}
          />
        )}
      </DataTable>

      {modalOpen && (
        <InspectionPolicyModal
          policy={editingPolicy}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
};

function ActionsCell({
  policy,
  onEdit,
}: {
  policy: InspectionPolicy;
  onEdit: () => void;
}) {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const policyApi = useApiCall<InspectionPolicy>(
    `/inspection-policies/${policy.id}`,
  );
  const deleteApi = policyApi.del;
  const updateApi = policyApi.put;

  const handleDelete = () => {
    notify({
      title: "Inspection Policy",
      description: `"${policy.name}" deleted`,
      loadingMessage: "Deleting...",
      promise: deleteApi().then(() => mutate("/inspection-policies")),
    });
  };

  const handleToggle = () => {
    const updated = { ...policy, enabled: !policy.enabled };
    notify({
      title: "Inspection Policy",
      description: `"${policy.name}" ${updated.enabled ? "enabled" : "disabled"}`,
      loadingMessage: updated.enabled ? "Enabling..." : "Disabling...",
      promise: updateApi(updated).then(() => mutate("/inspection-policies")),
    });
  };

  if (!permission.policies.update && !permission.policies.delete) return null;

  return (
    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="default-outline" className="!px-3">
            <MoreVertical size={16} className="shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto min-w-[200px]" align="end">
          {permission.policies.update && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit size={14} className="shrink-0" />
              Edit Policy
            </DropdownMenuItem>
          )}
          {permission.policies.update && (
            <DropdownMenuItem onClick={handleToggle}>
              {policy.enabled ? (
                <>
                  <PowerOff size={14} className="shrink-0" />
                  Disable Policy
                </>
              ) : (
                <>
                  <Power size={14} className="shrink-0" />
                  Enable Policy
                </>
              )}
            </DropdownMenuItem>
          )}
          {permission.policies.delete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-500"
              >
                <Trash2 size={14} className="shrink-0" />
                Delete Policy
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default InspectionPoliciesTable;
