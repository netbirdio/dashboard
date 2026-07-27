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
import { MoreVertical, Trash2, Undo2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { SetupKey } from "@/interfaces/SetupKey";

type Props = {
  setupKey: SetupKey;
};
export default function SetupKeyActionCell({ setupKey }: Readonly<Props>) {
  const t = useTranslations("setupKeys");
  const tCommon = useTranslations("common");
  const { confirm } = useDialog();
  const request = useApiCall<SetupKey>("/setup-keys/" + setupKey.id);
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();

  const canRevoke =
    !setupKey.revoked && setupKey.valid && permission.setup_keys.update;
  const canDelete = permission.setup_keys.delete;

  const keyName = setupKey?.name || t("key");

  const handleRevoke = async () => {
    const choice = await confirm({
      title: t("revokeConfirmTitle", { name: keyName }),
      description: t("revokeConfirmDescription"),
      confirmText: t("revoke"),
      cancelText: tCommon("cancel"),
      type: "danger",
    });
    if (!choice) return;

    notify({
      title: keyName,
      description: t("revokeSuccessDescription"),
      promise: request
        .put({
          name: keyName,
          type: setupKey.type,
          expires_in: setupKey.expires_in,
          revoked: true,
          auto_groups: setupKey.auto_groups,
          usage_limit: setupKey.usage_limit,
          ephemeral: setupKey.ephemeral,
          allow_extra_dns_labels: setupKey.allow_extra_dns_labels,
        })
        .then(() => {
          mutate("/setup-keys");
          mutate("/groups");
        }),
      loadingMessage: t("revokeLoading"),
    });
  };

  const handleDelete = async () => {
    const choice = await confirm({
      title: t("deleteConfirmTitle", { name: keyName }),
      description: t("deleteConfirmDescription"),
      confirmText: tCommon("delete"),
      cancelText: tCommon("cancel"),
      type: "danger",
    });
    if (!choice) return;

    notify({
      title: keyName,
      description: t("deleteSuccessDescription"),
      promise: request.del().then(() => {
        mutate("/setup-keys");
        mutate("/groups");
      }),
      loadingMessage: t("deleteLoading"),
    });
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
          <Button
            variant={"secondary"}
            className={"!px-3"}
            aria-label={t("openActionsMenu")}
            data-testid={"setup-key-actions"}
          >
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className={"w-auto"} align={"end"}>
          <DropdownMenuItem
            onClick={handleRevoke}
            disabled={!canRevoke}
            variant={"danger"}
            data-testid={"revoke-setup-key"}
          >
            <div className={"flex gap-3 items-center"}>
              <Undo2Icon size={14} className={"shrink-0"} />
              {t("revoke")}
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={!canDelete}
            variant={"danger"}
            data-testid={"delete-setup-key"}
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
