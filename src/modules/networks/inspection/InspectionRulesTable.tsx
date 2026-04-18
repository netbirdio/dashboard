import Badge from "@components/Badge";
import Button from "@components/Button";
import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import NoResults from "@components/ui/NoResults";
import { notify } from "@components/Notification";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { useApiCall } from "@utils/api";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { IconCirclePlus } from "@tabler/icons-react";
import { ShieldCheckIcon, Trash2 } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  InspectionRule,
  NetworkRouter,
} from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
import { InspectionRuleModal } from "@/modules/networks/inspection/InspectionRuleModal";

type Props = {
  router: NetworkRouter;
  rules: InspectionRule[];
  isLoading: boolean;
};

export const InspectionRulesTable = ({ router, rules, isLoading }: Props) => {
  const { permission } = usePermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<InspectionRule | undefined>();

  const [sorting, setSorting] = useState<SortingState>([
    { id: "priority", desc: false },
  ]);

  const columns: ColumnDef<InspectionRule>[] = [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableHeader column={column}>Name</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <button
          className="text-sm text-nb-gray-100 font-medium hover:text-white transition-colors"
          onClick={() => {
            setEditingRule(row.original);
            setModalOpen(true);
          }}
        >
          {row.original.name}
        </button>
      ),
    },
    {
      id: "enabled",
      accessorKey: "enabled",
      header: ({ column }) => (
        <DataTableHeader column={column}>Active</DataTableHeader>
      ),
      cell: ({ row }) => (
        <RuleEnabledToggle router={router} rule={row.original} />
      ),
    },
    {
      id: "domains",
      accessorKey: "domains",
      header: ({ column }) => (
        <DataTableHeader column={column}>Domains</DataTableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.domains?.length ? (
            row.original.domains.map((d) => (
              <Badge key={d} variant="gray" className="text-xs font-mono">
                {d}
              </Badge>
            ))
          ) : (
            <span className="text-nb-gray-500 text-xs">Any</span>
          )}
        </div>
      ),
    },
    {
      id: "action",
      accessorKey: "action",
      header: ({ column }) => (
        <DataTableHeader column={column}>Action</DataTableHeader>
      ),
      cell: ({ row }) => <ActionBadge action={row.original.action} />,
    },
    {
      id: "priority",
      accessorKey: "priority",
      header: ({ column }) => (
        <DataTableHeader column={column}>Priority</DataTableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-nb-gray-400">
          {row.original.priority}
        </span>
      ),
    },
    {
      id: "actions",
      accessorKey: "id",
      header: "",
      cell: ({ row }) => (
        <RuleDeleteButton router={router} rule={row.original} />
      ),
    },
  ];

  return (
    <>
      <DataTable
        wrapperComponent={Card}
        wrapperProps={{ className: "mt-6 pb-2 w-full" }}
        sorting={sorting}
        setSorting={setSorting}
        minimal={true}
        showSearchAndFilters={true}
        inset={false}
        tableClassName={"mt-0"}
        text={"Inspection Rules"}
        columns={columns}
        keepStateInLocalStorage={false}
        data={rules}
        searchPlaceholder={"Search by rule name, domain..."}
        isLoading={isLoading}
        getStartedCard={
          <NoResults
            className={"py-4"}
            title={"No inspection rules configured"}
            description={
              "Add rules to control how traffic is inspected. Without rules, the default action applies to all connections."
            }
            icon={
              <ShieldCheckIcon size={18} className={"text-nb-gray-400"} />
            }
          />
        }
        paginationPaddingClassName={"px-0 pt-8"}
        rightSide={() => (
          <Button
            variant={"primary"}
            className={"ml-auto"}
            onClick={() => {
              setEditingRule(undefined);
              setModalOpen(true);
            }}
            disabled={!permission.networks.update}
          >
            <IconCirclePlus size={16} />
            Add Rule
          </Button>
        )}
      >
        {(table) => (
          <DataTableRowsPerPage
            table={table}
            disabled={!rules || rules.length === 0}
          />
        )}
      </DataTable>

      {modalOpen && (
        <InspectionRuleModal
          router={router}
          rule={editingRule}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
};

function ActionBadge({ action }: { action: string }) {
  const variant =
    action === "block" ? "red" : action === "inspect" ? "yellow" : "green";
  return (
    <Badge variant={variant} className="text-xs capitalize">
      {action}
    </Badge>
  );
}

function RuleEnabledToggle({
  router,
  rule,
}: {
  router: NetworkRouter;
  rule: InspectionRule;
}) {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const { network } = useNetworksContext();

  const update = useApiCall<NetworkRouter>(
    `/networks/${network?.id}/routers/${router?.id}`,
  ).put;

  const toggle = async () => {
    const updatedRules = router.inspection?.rules?.map((r) =>
      r.id === rule.id ? { ...r, enabled: !r.enabled } : r,
    );

    notify({
      title: "Inspection Rule",
      description: `Rule "${rule.name}" is now ${!rule.enabled ? "enabled" : "disabled"}`,
      loadingMessage: "Updating rule...",
      promise: update({
        ...router,
        inspection: { ...router.inspection!, rules: updatedRules },
      }).then(() => mutate(`/networks/${network?.id}/routers`)),
    });
  };

  return (
    <ToggleSwitch
      disabled={!permission.networks.update}
      checked={rule.enabled}
      size={"small"}
      onClick={toggle}
    />
  );
}

function RuleDeleteButton({
  router,
  rule,
}: {
  router: NetworkRouter;
  rule: InspectionRule;
}) {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const { network } = useNetworksContext();

  const update = useApiCall<NetworkRouter>(
    `/networks/${network?.id}/routers/${router?.id}`,
  ).put;

  const deleteRule = async () => {
    const updatedRules = router.inspection?.rules?.filter(
      (r) => r.id !== rule.id,
    );

    notify({
      title: "Inspection Rule",
      description: `Rule "${rule.name}" deleted`,
      loadingMessage: "Deleting rule...",
      promise: update({
        ...router,
        inspection: { ...router.inspection!, rules: updatedRules },
      }).then(() => mutate(`/networks/${network?.id}/routers`)),
    });
  };

  if (!permission.networks.update) return null;

  return (
    <button
      onClick={deleteRule}
      className="text-nb-gray-500 hover:text-red-500 transition-colors p-1"
    >
      <Trash2 size={14} />
    </button>
  );
}
