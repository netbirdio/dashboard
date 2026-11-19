import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useUserContext } from "@/contexts/UserProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { AccessToken } from "@/interfaces/AccessToken";
import { SetupKey } from "@/interfaces/SetupKey";

type Props = {
  access_token: AccessToken;
};
export default function AccessTokenActionCell({
  access_token,
}: Readonly<Props>) {
  const t = useTranslations();
  const { user } = useUserContext();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const deleteRequest = useApiCall<SetupKey>(
    `/users/${user.id}/tokens/${access_token.id}`,
  );

  const handleRevoke = async () => {
    notify({
      title: access_token.name,
      description: t("accessTokens.deleted"),
      promise: deleteRequest.del().then(() => {
        mutate(`/users/${user.id}/tokens`);
      }),
      loadingMessage: t("accessTokens.deleting"),
    });
  };

  const handleConfirm = async () => {
    const choice = await confirm({
      title: t("accessTokens.deleteTitle", { name: access_token.name }),
      description: t("accessTokens.deleteDescription"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
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
        data-testid={"access-token-delete"}
      >
        <Trash2 size={16} />
        {t("common.delete")}
      </Button>
    </div>
  );
}
