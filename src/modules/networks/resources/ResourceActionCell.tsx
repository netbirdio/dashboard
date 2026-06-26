"use client";

import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { notify } from "@components/Notification";
import { useTranslations } from "next-intl";
import { useApiCall } from "@utils/api";
import {
  MoreVertical,
  PowerIcon,
  SquarePenIcon,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  resource: NetworkResource;
};
export const ResourceActionCell = ({ resource }: Props) => {
  const t = useTranslations("networks");
  const { permission } = usePermissions();
  const { deleteResource, network, openResourceModal } = useNetworksContext();
  const { mutate } = useSWRConfig();
  const [open, setOpen] = useState(false);

  const update = useApiCall<NetworkResource>(
    `/networks/${network?.id}/resources/${resource?.id}`,
  ).put;

  const toggleEnabled = async () => {
    const nextEnabled = !resource.enabled;
    notify({
      title: t("updateResource"),
      description: nextEnabled
        ? t("resourceNowEnabled", { name: resource?.name })
        : t("resourceNowDisabled", { name: resource?.name }),
      loadingMessage: t("updatingResource"),
      duration: 1200,
      promise: update({
        ...resource,
        groups: resource.groups
          ?.map((g) => (g as Group).id)
          .filter((g) => g !== undefined),
        enabled: nextEnabled,
      }).then(() => {
        mutate(`/networks/${network?.id}/resources`);
      }),
    });
  };

  return (
    <div className={"flex justify-end"}>
      <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          disabled={!permission.networks.update && !permission.networks.delete}
        >
          <Button
            variant={"secondary"}
            className={"!px-3"}
            disabled={
              !permission.networks.update && !permission.networks.delete
            }
            aria-label={t("resourceEdit")}
          >
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto" align="end">
          <DropdownMenuItem
            onClick={() => {
              if (!network) return;
              openResourceModal(network, resource);
            }}
            disabled={!permission.networks.update}
          >
            <div className={"flex gap-3 items-center"}>
              <SquarePenIcon size={14} className={"shrink-0"} />
              {t("resourceEdit")}
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setOpen(false);
              toggleEnabled();
            }}
            disabled={!permission.networks.update}
          >
            <div className={"flex gap-3 items-center"}>
              <PowerIcon size={14} className={"shrink-0"} />
              {resource.enabled ? t("resourceDisable") : t("resourceEnable")}
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              if (!network) return;
              deleteResource(network, resource);
            }}
            variant={"danger"}
            disabled={!permission.networks.delete}
          >
            <div className={"flex gap-3 items-center"}>
              <Trash2 size={14} className={"shrink-0"} />
              {t("resourceDelete")}
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
