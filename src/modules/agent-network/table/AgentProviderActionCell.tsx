import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import FullTooltip from "@components/FullTooltip";
import { MoreVertical, Power, SquarePenIcon, Trash2 } from "lucide-react";
import * as React from "react";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { useAgentNetworkText } from "@/modules/agent-network/agentNetworkText";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import { AIProvider } from "@/modules/agent-network/data/mockData";

type Props = {
  provider: AIProvider;
};

export default function AgentProviderActionCell({ provider }: Readonly<Props>) {
  const t = useTranslations();
  const { tr } = useAgentNetworkText();
  const { confirm } = useDialog();
  const { policies, toggleProvider, deleteProvider, openProviderEdit } =
    useAIProviders();
  // Each menu item maps to its own operation grant; read-only viewers
  // (usage_viewer) get no menu at all instead of actions that can only 403.
  const { permission } = usePermissions();
  const canUpdate = !!permission?.["agent_network.providers"]?.update;
  const canDelete = !!permission?.["agent_network.providers"]?.delete;

  const referencingPolicies = policies.filter((p) =>
    p.destinationProviderIds.includes(provider.id),
  );
  const inUse = referencingPolicies.length > 0;

  const handleDelete = async () => {
    const ok = await confirm({
      title: tr("agentNetwork.deleteNamed", { name: provider.name }),
      description: tr("agentNetwork.deleteProviderDesc"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      type: "danger",
    });
    if (!ok) return;
    await deleteProvider(provider.id);
  };

  if (!canUpdate && !canDelete) return null;

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
          {canUpdate && (
            <DropdownMenuItem
              data-testid={"edit-provider"}
              onClick={(e) => {
                e.stopPropagation();
                openProviderEdit(provider);
              }}
            >
              <div className={"flex gap-3 items-center"}>
                <SquarePenIcon size={14} className={"shrink-0"} />
                {t("common.edit")}
              </div>
            </DropdownMenuItem>
          )}

          {canUpdate && (
            <DropdownMenuItem onClick={() => toggleProvider(provider.id)}>
              <div className={"flex gap-3 items-center"}>
                <Power size={14} className={"shrink-0"} />
                {provider.enabled ? t("common.disable") : t("common.enable")}
              </div>
            </DropdownMenuItem>
          )}

          {canUpdate && canDelete && <DropdownMenuSeparator />}

          {canDelete && (
            <FullTooltip
              disabled={!inUse}
              interactive={false}
              content={
                <div className={"text-xs max-w-xs"}>
                  {tr("agentNetwork.providerInUse", {
                    count: referencingPolicies.length,
                  })}
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
                  {t("common.delete")}
                </div>
              </DropdownMenuItem>
            </FullTooltip>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
