import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import FullTooltip from "@components/FullTooltip";
import { MoreVertical, Power, Trash2 } from "lucide-react";
import * as React from "react";
import { useDialog } from "@/contexts/DialogProvider";
import { AIProvider } from "@/modules/agent-network/data/mockData";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";

type Props = {
  provider: AIProvider;
};

export default function AgentProviderActionCell({ provider }: Readonly<Props>) {
  const { confirm } = useDialog();
  const { policies, toggleProvider, deleteProvider } = useAIProviders();

  const referencingPolicies = policies.filter((p) =>
    p.destinationProviderIds.includes(provider.id),
  );
  const inUse = referencingPolicies.length > 0;

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete '${provider.name}'?`,
      description:
        "Are you sure you want to delete this provider? The reverse-proxy service that fronts it will also be removed. This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!ok) return;
    await deleteProvider(provider.id);
  };

  return (
    <div className={"flex justify-end pr-4"}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <Button variant={"secondary"} className={"!px-3"}>
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className={"w-auto"} align={"end"}>
          <DropdownMenuItem onClick={() => toggleProvider(provider.id)}>
            <div className={"flex gap-3 items-center"}>
              <Power size={14} className={"shrink-0"} />
              {provider.enabled ? "Disable" : "Enable"}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <FullTooltip
            disabled={!inUse}
            interactive={false}
            content={
              <div className={"text-xs max-w-xs"}>
                This provider is referenced by{" "}
                {referencingPolicies.length === 1
                  ? "1 policy"
                  : `${referencingPolicies.length} policies`}{" "}
                and cannot be deleted. Detach it from the policy first.
              </div>
            }
          >
            <DropdownMenuItem
              onClick={(e) => {
                if (inUse) {
                  e.preventDefault();
                  return;
                }
                handleDelete();
              }}
              variant={"danger"}
              disabled={inUse}
            >
              <div className={"flex gap-3 items-center"}>
                <Trash2 size={14} className={"shrink-0"} />
                Delete
              </div>
            </DropdownMenuItem>
          </FullTooltip>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
