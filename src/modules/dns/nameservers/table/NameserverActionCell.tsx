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
import { useApiCall } from "@utils/api";
import { MoreVertical, PowerIcon, Trash2 } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { NameserverGroup } from "@/interfaces/Nameserver";
import { useTranslations } from "next-intl";

type Props = {
  ns: NameserverGroup;
};
export default function NameserverActionCell({ ns }: Readonly<Props>) {
  const { confirm } = useDialog();
  const nsRequest = useApiCall<NameserverGroup>("/dns/nameservers");
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const [open, setOpen] = useState(false);
  const t = useTranslations("dns");
  const tCommon = useTranslations("common");

  const canUpdate = permission.nameservers.update;
  const canDelete = permission.nameservers.delete;

  const handleToggle = async () => {
    const enabled = !ns.enabled;
    notify({
      title: ns.name,
      description: t("nameserverToggleSuccess", {
        status: enabled ? tCommon("enabled").toLowerCase() : tCommon("disabled").toLowerCase(),
      }),
      loadingMessage: t("nameserverToggleLoading"),
      promise: nsRequest
        .put(
          {
            name: ns.name,
            description: ns.description,
            nameservers: ns.nameservers,
            enabled: enabled,
            groups: ns.groups,
            primary: ns.primary,
            domains: ns.domains,
            search_domains_enabled: ns.search_domains_enabled,
          },
          `/${ns?.id}`,
        )
        .then(() => {
          mutate("/dns/nameservers");
        }),
    });
  };

  const deleteRule = async () => {
    notify({
      title: tCommon("delete") + " " + ns.name,
      description: t("nameserverDeletedSuccess"),
      promise: nsRequest.del("", `/${ns.id}`).then(() => {
        mutate("/dns/nameservers");
      }),
      loadingMessage: t("deletingNameserver"),
    });
  };

  const openConfirm = async () => {
    const choice = await confirm({
      title: t("confirmDeleteNameserverTitle", { name: ns.name }),
      description: t("confirmDeleteNameserver"),
      confirmText: tCommon("delete"),
      cancelText: tCommon("cancel"),
      type: "danger",
    });
    if (!choice) return;
    deleteRule().then();
  };

  return (
    <div className={"flex justify-end pr-4"}>
      <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <Button
            variant={"secondary"}
            className={"!px-3"}
            aria-label={t("nameserverActionsAria")}
            data-testid={"nameserver-actions"}
          >
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className={"w-auto"} align={"end"}>
          <DropdownMenuItem
            onClick={() => {
              setOpen(false);
              handleToggle();
            }}
            disabled={!canUpdate}
            data-testid="nameserver-active-toggle"
          >
            <div className={"flex gap-3 items-center"}>
              <PowerIcon size={14} className={"shrink-0"} />
              {ns.enabled ? t("disable") : t("enable")}
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={openConfirm}
            disabled={!canDelete}
            variant={"danger"}
            data-testid="delete-nameserver"
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
