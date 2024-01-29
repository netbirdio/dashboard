import { useOidc } from "@axa-fr/react-oidc";
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
import { Account } from "@/interfaces/Account";

type Props = {
  account: Account;
};
const config = loadConfig();

export default function DangerZoneTab({ account }: Props) {
  const { confirm } = useDialog();
  const deleteRequest = useApiCall<Account>("/accounts/" + account.id);
  const { logout } = useOidc();

  const logoutSession = async () => {
    return logout("/", { client_id: config.clientId }).then();
  };

  const deleteAccount = async () => {
    notify({
      title: "Delete NetBird account",
      description: "NetBird account was successfully deleted.",
      promise: deleteRequest.del().then(() => {
        logoutSession().then();
      }),
      loadingMessage: "Deleting the account...",
    });
  };

  const handleConfirm = async () => {
    const choice = await confirm({
      title: "Delete NetBird account",
      description:
        "Are you sure you want to delete your NetBird account? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
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
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Danger Zone"}
            icon={<AlertOctagonIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <h1>Danger Zone</h1>
        <div className={"gap-6 mt-6 max-w-lg"}>
          <Card
            className={
              "w-full flex flex-col gap-2 border-red-600 bg-red-950/50"
            }
          >
            <div className={"px-8 py-6"}>
              <p className={"text-xl font-medium mb-2 !text-red-50"}>
                Delete NetBird account
              </p>
              <p className={"!text-red-50/80"}>
                Before proceeding to delete your Netbird account, please be
                aware that this action is irreversible. Once your account is
                deleted, you will permanently lose access to all associated
                data, including your peers, users, groups, policies, and routes.
              </p>
              <div className={"mt-6"}>
                <Button variant={"danger"} onClick={handleConfirm} size={"xs"}>
                  Delete Account
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Tabs.Content>
  );
}
