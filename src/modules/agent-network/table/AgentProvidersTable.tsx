"use client";

import Badge from "@components/Badge";
import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import { Boxes, ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import React from "react";
import AIAccessIcon from "@/assets/icons/AgentNetworkIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import AIProviderLogo from "@/modules/agent-network/AIProviderLogo";
import AIProviderModal from "@/modules/agent-network/AIProviderModal";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import { AIProvider } from "@/modules/agent-network/data/mockData";
import AgentProviderActionCell from "@/modules/agent-network/table/AgentProviderActionCell";
import { useProviderCatalog } from "@/modules/agent-network/useProviderCatalog";

function NameCell({ provider }: { provider: AIProvider }) {
  const { getById } = useProviderCatalog();
  const catalog = getById(provider.providerId);
  return (
    <div
      className={
        "flex w-full items-center gap-4 dark:text-neutral-300 text-neutral-500 transition-all group/provider rounded-md py-2 pl-3 pr-4 max-w-[450px]"
      }
    >
      <div className={"relative shrink-0"}>
        <AIProviderLogo providerId={provider.providerId} size={40} tile />
        <div
          className={cn(
            "h-2 w-2 rounded-full absolute bottom-0 right-0 z-10",
            provider.enabled ? "bg-green-500" : "bg-nb-gray-700",
          )}
        ></div>
        <div
          className={cn(
            "h-3 w-3 bg-nb-gray-950 rounded-tl-[8px] rounded-br absolute bottom-0 right-0 transition-all",
            "group-hover/table-row:bg-nb-gray-940",
            "group-hover/provider:!bg-nb-gray-910",
          )}
        ></div>
      </div>
      <div className={"flex items-start flex-col min-w-0"}>
        <p
          className={
            "font-medium text-left whitespace-nowrap text-sm dark:text-nb-gray-100"
          }
          data-testid={provider.name}
        >
          {provider.name}
        </p>
        <DescriptionWithTooltip
          className={"text-left mt-0.5"}
          text={`${catalog?.name ?? provider.providerId} · ${
            provider.upstreamUrl
          }`}
          maxChars={40}
        />
      </div>
    </div>
  );
}

// An empty allow-list means the provider is unrestricted, so the count is
// replaced by what it actually means rather than showing a zero.
function ModelsCell({ provider }: { provider: AIProvider }) {
  const count = provider.models.length;
  return (
    <div className={"flex"}>
      <Badge
        variant={"gray"}
        className={"h-[34px]"}
        data-testid={`provider-models-${provider.name}`}
      >
        <Boxes size={11} />
        <span className={"font-medium text-xs"}>
          {count === 0 ? "All Models" : count}
        </span>
      </Badge>
    </div>
  );
}

const columns: ColumnDef<AIProvider>[] = [
  {
    id: "name",
    accessorKey: "name",
    sortingFn: "text",
    header: ({ column }) => (
      <DataTableHeader column={column}>Name</DataTableHeader>
    ),
    cell: ({ row }) => <NameCell provider={row.original} />,
  },
  {
    id: "models",
    accessorFn: (p) => p.models.length,
    sortingFn: "basic",
    header: ({ column }) => (
      <DataTableHeader column={column}>Models</DataTableHeader>
    ),
    cell: ({ row }) => <ModelsCell provider={row.original} />,
  },
  {
    id: "actions",
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <AgentProviderActionCell provider={row.original} />,
  },
];

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function AgentProvidersTable({
  headingTarget,
}: Readonly<Props>) {
  const path = usePathname();
  const {
    providers,
    isLoading,
    editingProvider,
    openProviderEdit,
    closeProviderEdit,
  } = useAIProviders();
  // Read-only viewers (usage_viewer) see the list but no write flows: the
  // edit modal needs update, and opening it would also mislead them with
  // the bootstrap warning since they can't read the settings row.
  const { permission } = usePermissions();
  const canUpdate = !!permission?.["agent_network.providers"]?.update;

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "name", desc: false }],
  );

  return (
    <>
      {editingProvider && (
        <AIProviderModal
          open={true}
          onOpenChange={(o) => {
            if (!o) closeProviderEdit();
          }}
          provider={editingProvider}
        />
      )}
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Providers"}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={providers}
        searchPlaceholder={"Search by name..."}
        onRowClick={
          canUpdate ? (row) => openProviderEdit(row.original) : undefined
        }
        getStartedCard={
          <GetStartedTest
            icon={
              <SquareIcon
                icon={<AIAccessIcon className={"text-nb-gray-200"} size={20} />}
                color={"gray"}
                size={"large"}
              />
            }
            title={"Connect a provider"}
            description={
              "Route OpenAI, Anthropic, and other LLM APIs through NetBird to enforce access control, track token spend, and capture prompts."
            }
            button={
              <div className={"gap-x-4 flex items-center justify-center"}>
                <AddProviderButton />
              </div>
            }
            learnMore={
              <>
                Learn more about
                <InlineLink
                  href={"https://docs.netbird.io/agent-network/providers"}
                  target={"_blank"}
                >
                  Agent Network Providers
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </>
            }
          />
        }
        rightSide={() =>
          providers.length > 0 && (
            <div className={cn("gap-x-4 ml-auto flex")}>
              <AddProviderButton />
            </div>
          )
        }
        initialPageSize={25}
      />
    </>
  );
}

const AddProviderButton = () => {
  const { openWizard } = useAIProviders();
  const { permission } = usePermissions();
  // Connecting a provider needs the create grant; read-only viewers get no
  // button instead of a wizard that can only fail.
  if (!permission?.["agent_network.providers"]?.create) return null;
  return (
    <Button
      variant={"primary"}
      onClick={openWizard}
      data-testid={"connect-agent-network-provider"}
    >
      <PlusCircle size={16} />
      Connect Provider
    </Button>
  );
};
