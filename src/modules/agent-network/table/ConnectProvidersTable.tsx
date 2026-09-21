"use client";

import Badge from "@components/Badge";
import Button from "@components/Button";
import Card from "@components/Card";
import FullTooltip from "@components/FullTooltip";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { Boxes } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import AIProviderLogo from "@/modules/agent-network/AIProviderLogo";
import { AIProviderId } from "@/modules/agent-network/data/mockData";
import { APIMeProvider } from "@/modules/agent-network/useMyAgentNetworkSetup";

function NameCell({ provider }: { provider: APIMeProvider }) {
  return (
    <div className={"flex items-center gap-3 py-2"}>
      {/* catalog_id comes off the wire as a plain string; an id the catalog
          doesn't know renders the neutral badge. */}
      <AIProviderLogo
        providerId={provider.catalog_id as AIProviderId}
        size={36}
        tile
      />
      <div className={"flex flex-col items-start min-w-0"}>
        <span
          className={
            "font-medium text-sm dark:text-nb-gray-100 whitespace-nowrap"
          }
        >
          {provider.name}
        </span>
        {/* The name is operator-chosen and often just the vendor, so the
            catalog id is what actually says which provider is behind it. */}
        <span className={"text-xs text-nb-gray-400 whitespace-nowrap"}>
          {provider.catalog_id}
        </span>
      </div>
    </div>
  );
}

// Same badge the admin providers table uses for its allow-list, with the
// model names on hover — the caller has no other page to look them up on.
function ModelsCell({ provider }: { provider: APIMeProvider }) {
  const badge = (
    <Badge
      variant={"gray"}
      className={"h-[34px]"}
      useHover={!provider.all_models_allowed}
    >
      <Boxes size={11} />
      <span className={"font-medium text-xs"}>
        {provider.all_models_allowed ? "All Models" : provider.models.length}
      </span>
    </Badge>
  );

  if (provider.all_models_allowed) return <div className={"flex"}>{badge}</div>;

  return (
    <div className={"flex"}>
      <FullTooltip
        content={
          <div className={"flex flex-col gap-1 text-xs"}>
            {provider.models.map((model) => (
              <div key={model}>{model}</div>
            ))}
          </div>
        }
      >
        {badge}
      </FullTooltip>
    </div>
  );
}

const columns: ColumnDef<APIMeProvider>[] = [
  {
    id: "name",
    accessorKey: "name",
    sortingFn: "text",
    header: ({ column }) => (
      <DataTableHeader column={column}>Provider</DataTableHeader>
    ),
    cell: ({ row }) => <NameCell provider={row.original} />,
  },
  {
    id: "models",
    // All-models rows sort above allow-listed ones, then by list length.
    accessorFn: (p) => (p.all_models_allowed ? Infinity : p.models.length),
    sortingFn: "basic",
    header: ({ column }) => (
      <DataTableHeader column={column}>Models</DataTableHeader>
    ),
    cell: ({ row }) => <ModelsCell provider={row.original} />,
  },
];

type Props = {
  providers: APIMeProvider[];
};

// ConnectProvidersTable lists what the caller's own policies let them reach.
// Same DataTable the admin providers table uses, minus the write flows: the
// rows come from the caller-scoped agent-config answer, so there is nothing
// here to connect, edit, or delete.
export default function ConnectProvidersTable({ providers }: Readonly<Props>) {
  const path = usePathname();
  const router = useRouter();
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "name", desc: false }],
  );

  // Whoever can edit policies can fix this themselves, so they get the action
  // instead of being told to ask someone else.
  const { permission } = usePermissions();
  const canManagePolicies = !!permission?.["agent_network.policies"]?.update;

  return (
    <DataTable
      // Minimal-in-a-card, the shape the group detail page gives its
      // secondary tables: this one sits under a heading on a page that
      // already has its own, rather than being the page.
      wrapperComponent={Card}
      wrapperProps={{ className: "mt-3 w-full" }}
      minimal={true}
      inset={false}
      tableClassName={"mt-0"}
      paginationPaddingClassName={"px-0 pt-8"}
      text={"Providers"}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={providers}
      showSearchAndFilters={false}
      initialPageSize={25}
      // Nothing to list means no policy covers this caller yet, so the card
      // says so rather than leaving an empty table behind.
      getStartedCard={
        <NoResults
          className={"py-4"}
          icon={<AgentNetworkIcon className={"text-nb-gray-300"} size={20} />}
          title={"No providers available yet"}
          description={
            canManagePolicies
              ? "No access policy covers your user yet. Add one of your groups to a policy to route your own agent through NetBird."
              : "You don’t have access to any providers yet. Ask your administrator to add you to an Agent Network access policy."
          }
        >
          {canManagePolicies && (
            <Button
              variant={"primary"}
              size={"sm"}
              className={"mt-4"}
              onClick={() => router.push("/agent-network/policies")}
            >
              Go to Policies
            </Button>
          )}
        </NoResults>
      }
    />
  );
}
