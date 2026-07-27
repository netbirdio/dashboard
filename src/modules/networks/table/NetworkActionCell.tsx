"use client";

import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { useTranslations } from "next-intl";
import { EyeIcon, MoreVertical, PencilLineIcon, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  network: Network;
};
export default function NetworkActionCell({ network }: Readonly<Props>) {
  const t = useTranslations("networks");
  const tCommon = useTranslations("common");
  const { permission } = usePermissions();
  const { deleteNetwork, openEditNetworkModal } = useNetworksContext();
  const router = useRouter();

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
          <Button variant={"secondary"} className={"!px-3"} data-testid="network-actions">
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto" align="end">
          <DropdownMenuItem
            onClick={() => router.push(`/network?id=${network.id}`)}
            data-testid="view-network-details"
          >
            <div className={"flex gap-3 items-center"}>
              <EyeIcon size={14} className={"shrink-0"} />
              {t("viewDetails")}
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openEditNetworkModal(network)}
            disabled={!permission.networks.update}
            data-testid="rename-network"
          >
            <div className={"flex gap-3 items-center"}>
              <PencilLineIcon size={14} className={"shrink-0"} />
              {t("renameNetwork")}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => deleteNetwork(network)}
            variant={"danger"}
            disabled={!permission.networks.delete}
          >
            <div className={"flex gap-3 items-center"}>
              <Trash2 size={14} className={"shrink-0"} />
              {tCommon("delete")}
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
