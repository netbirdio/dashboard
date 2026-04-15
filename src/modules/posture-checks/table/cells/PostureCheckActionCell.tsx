import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { PostureCheck } from "@/interfaces/PostureCheck";

type Props = {
  check: PostureCheck;
};
export const PostureCheckActionCell = ({ check }: Props) => {
  const { permission } = usePermissions();
  const { t } = useI18n();

  const deleteRequest = useApiCall("/posture-checks");
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();

  const handleDelete = async () => {
    const choice = await confirm({
      title: t("postureChecks.deleteConfirmTitle", { name: check.name }),
      description: t("postureChecks.deleteConfirmDescription"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
      type: "danger",
    });
    if (choice) {
      notify({
        title: check.name,
        description: t("postureChecks.deletedDescription"),
        promise: deleteRequest.del({}, `/${check.id}`).then(() => {
          mutate("/posture-checks").then();
        }),
        loadingMessage: t("postureChecks.deleting"),
      });
    }
  };

  const hasPolicies = check.policies ? check.policies?.length > 0 : false;

  return (
    <div className={"flex justify-end pr-4"}>
      <FullTooltip
        disabled={!hasPolicies}
        content={
          <div className={"text-xs max-w-xs"}>
            {t("postureChecks.deleteDisabledTooltip")}
          </div>
        }
        interactive={false}
      >
        <Button
          variant={"danger-outline"}
          size={"sm"}
          onClick={handleDelete}
          disabled={hasPolicies || !permission.policies.delete}
        >
          <Trash2 size={16} />
          {t("actions.delete")}
        </Button>
      </FullTooltip>
    </div>
  );
};
