import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useUserContext } from "@/contexts/UserProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { AccessToken } from "@/interfaces/AccessToken";
import { SetupKey } from "@/interfaces/SetupKey";

type Props = {
  access_token: AccessToken;
};
export default function AccessTokenActionCell({
  access_token,
}: Readonly<Props>) {
  const { user } = useUserContext();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const { t } = useI18n();
  const { mutate } = useSWRConfig();
  const deleteRequest = useApiCall<SetupKey>(
    `/users/${user.id}/tokens/${access_token.id}`,
  );

  const handleRevoke = async () => {
    notify({
      title: access_token.name,
      description: t("accessTokens.deletedDescription"),
      promise: deleteRequest.del().then(() => {
        mutate(`/users/${user.id}/tokens`);
      }),
      loadingMessage: t("accessTokens.deleting"),
    });
  };

  const handleConfirm = async () => {
    const choice = await confirm({
      title: t("accessTokens.deleteConfirmTitle", { name: access_token.name }),
      description: t("accessTokens.deleteConfirmDescription"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
      type: "danger",
    });
    if (!choice) return;
    handleRevoke().then();
  };

  return (
    <div className={"flex justify-end pr-4"}>
      <Button
        disabled={!permission.pats.delete}
        variant={"danger-outline"}
        size={"sm"}
        onClick={handleConfirm}
        data-cy={"access-token-delete"}
      >
        <Trash2 size={16} />
        {t("actions.delete")}
      </Button>
    </div>
  );
}
