import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { Copy, MoreVertical, PowerIcon, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useState } from "react";
import { mutate } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { Policy } from "@/interfaces/Policy";

type Props = {
  policy: Policy;
};

export default function AccessControlActionCell({ policy }: Readonly<Props>) {
  const t = useTranslations("policies");
  const tCommon = useTranslations("common");
  const { confirm } = useDialog();
  const { permission } = usePermissions();
  const {
    deletePolicy,
    updatePolicy,
    serializeRules,
    openDuplicatePolicyModal,
  } = usePolicies();
  const [open, setOpen] = useState(false);

  const canCreate = permission.policies.create;
  const canUpdate = permission.policies.update;
  const canDelete = permission.policies.delete;

  const handleToggle = async () => {
    const nextEnabled = !policy.enabled;
    updatePolicy(
      policy,
      {
        enabled: nextEnabled,
        rules: serializeRules(policy.rules, nextEnabled),
      },
      () => {
        mutate("/policies");
      },
      nextEnabled ? t("policyEnabledSuccess") : t("policyDisabledSuccess"),
    );
  };

  const handleDelete = async () => {
    const choice = await confirm({
      title: t("confirmDeleteTitle", { name: policy.name }),
      description: t("confirmDeleteDescription"),
      confirmText: tCommon("delete"),
      cancelText: tCommon("cancel"),
      type: "danger",
    });
    if (!choice) return;
    await deletePolicy(policy);
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
            aria-label={t("policyActions")}
            data-testid={"policy-actions"}
          >
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className={"w-auto"} align={"end"}>
          <DropdownMenuItem
            onClick={() => {
              setOpen(false);
              openDuplicatePolicyModal(policy);
            }}
            disabled={!canCreate}
            data-testid={"duplicate-policy"}
          >
            <div className={"flex gap-3 items-center"}>
              <Copy size={14} className={"shrink-0"} />
              Duplicate
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setOpen(false);
              handleToggle();
            }}
            disabled={!canUpdate}
          >
            <div className={"flex gap-3 items-center"}>
              <PowerIcon size={14} className={"shrink-0"} />
              {policy.enabled ? t("disable") : t("enable")}
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={!canDelete}
            variant={"danger"}
            data-testid={"delete-policy"}
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
