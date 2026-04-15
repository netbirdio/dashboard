import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import Card from "@components/Card";
import { notify } from "@components/Notification";
import * as Tabs from "@radix-ui/react-tabs";
import { useApiCall } from "@utils/api";
import loadConfig from "@utils/config";
import { AlertOctagonIcon } from "lucide-react";
import React from "react";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { useDialog } from "@/contexts/DialogProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { Account } from "@/interfaces/Account";

type Props = {
  account: Account;
};
const config = loadConfig();

export default function DangerZoneTab({ account }: Props) {
  const { confirm } = useDialog();
  const deleteRequest = useApiCall<Account>("/accounts/" + account.id);
  const { logout } = useLoggedInUser();
  const { t } = useI18n();

  const deleteAccount = async () => {
    const deletePromise = new Promise<void>((resolve, reject) => {
      return deleteRequest
        .del()
        .catch((error) => reject(error))
        .then(() => {
          // Clear browser storage after account deletion
          if (typeof window !== "undefined") {
            localStorage.clear();
            sessionStorage.clear();
            // Optionally, clear cookies if needed
            // document.cookie = ... (set cookies to expire)
          }
          logout().then();
          resolve();
        });
    });

    notify({
      title: t("dangerZone.deleteAccountTitle"),
      description: t("dangerZone.deletedDescription"),
      promise: deletePromise,
      loadingMessage: t("dangerZone.deleting"),
    });
  };

  const handleConfirm = async () => {
    const choice = await confirm({
      title: t("dangerZone.deleteAccountTitle"),
      description: t("dangerZone.confirmDescription"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
      type: "danger",
    });
    if (!choice) return;
    deleteAccount().then();
  };

  return (
    <Tabs.Content value={"danger-zone"}>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={t("settings.title")}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings"}
            label={t("settings.dangerZone")}
            icon={<AlertOctagonIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <h1>{t("settings.dangerZone")}</h1>
        <div className={"gap-6 mt-6 max-w-lg"}>
          <Card
            className={
              "w-full flex flex-col gap-2 border-red-600 bg-red-950/50"
            }
          >
            <div className={"px-8 py-6"}>
              <p className={"text-xl font-medium mb-2 !text-red-50"}>
                {t("dangerZone.deleteAccountTitle")}
              </p>
              <p className={"!text-red-50/80"}>
                {t("dangerZone.deleteAccountWarning")}
              </p>
              <div className={"mt-6"}>
                <Button variant={"danger"} onClick={handleConfirm} size={"xs"}>
                  {t("dangerZone.deleteAccountButton")}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Tabs.Content>
  );
}
