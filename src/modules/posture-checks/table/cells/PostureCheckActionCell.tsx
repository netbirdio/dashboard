import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useTranslations } from "next-intl";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { PostureCheck } from "@/interfaces/PostureCheck";

type Props = {
  check: PostureCheck;
};
export const PostureCheckActionCell = ({ check }: Props) => {
  const { permission } = usePermissions();
  const tCommon = useTranslations("common");
  const tPosture = useTranslations("postureChecks");

  const deleteRequest = useApiCall("/posture-checks");
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();

  const handleDelete = async () => {
    const choice = await confirm({
      title: tPosture("confirmDeleteTitle", { name: check.name }),
      description: tPosture("confirmDeleteDescription"),
      confirmText: tCommon("delete"),
      cancelText: tCommon("cancel"),
      type: "danger",
    });
    if (choice) {
      notify({
        title: check.name,
        description: tPosture("postureCheckDeleted"),
        promise: deleteRequest.del({}, `/${check.id}`).then(() => {
          mutate("/posture-checks").then();
        }),
        loadingMessage: tPosture("deletingPostureCheck"),
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
            {tPosture("assignedToPolicyCannotDelete")}
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
          {tCommon("delete")}
        </Button>
      </FullTooltip>
    </div>
  );
};
