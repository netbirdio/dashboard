import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { JSONFileUpload } from "@components/JSONFileUpload";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import { notify } from "@components/Notification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { useHasChanges } from "@hooks/useHasChanges";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import {
  AlertOctagon,
  Box,
  Cog,
  FolderGit2,
  KeyRound,
  RefreshCw,
  UserCircle,
} from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/google-workspace.png";
import { useDialog } from "@/contexts/DialogProvider";
import { GoogleWorkspaceIntegration } from "@/interfaces/IdentityProvider";
import { GroupPrefixInput } from "@/modules/integrations/idp-sync/GroupPrefixInput";
import { useIntegrations } from "@/modules/integrations/idp-sync/useIntegrations";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export default function GoogleWorkspaceConfiguration({
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const { google } = useIntegrations();

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
        {google && (
          <ConfigurationContent
            onSuccess={() => {
              onOpenChange(false);
              onSuccess && onSuccess();
            }}
            config={google}
          />
        )}
      </Modal>
    </>
  );
}

type ModalProps = {
  onSuccess: () => void;
  config: GoogleWorkspaceIntegration;
};

export function ConfigurationContent({ onSuccess, config }: ModalProps) {
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();

  const [tab, setTab] = useState<string>("settings");

  const googleRequest = useApiCall<GoogleWorkspaceIntegration>(
    "/integrations/google-idp",
  );

  const accountKeyPlaceholder = "******************************";
  const [serviceAccountKey, setServiceAccountKey] = useState(
    accountKeyPlaceholder,
  );

  const [customerID, setCustomerID] = useState(config.customerId);
  const [interval, setInterval] = useState(config.syncInterval.toString());

  const [groupPrefixes, setGroupPrefixes] = useState<string[]>(
    config.group_prefixes || [],
  );
  const [userGroupPrefixes, setUserGroupPrefixes] = useState<string[]>(
    config.user_group_prefixes || [],
  );

  const deleteIntegration = async () => {
    const choice = await confirm({
      title: `Delete integration?`,
      description: "Are you sure you want to delete this integration?",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!choice) return;

    notify({
      title: "Google Workspace Integration",
      description: `Google Workspace was successfully deleted`,
      promise: googleRequest.del({}, `/${config.id}`).then(() => {
        mutate("/integrations/google-idp");
        onSuccess();
      }),
      loadingMessage: "Deleting integration...",
    });
  };

  const updateIntegration = async () => {
    notify({
      title: "Google Workspace Integration",
      description: `Google Workspace was successfully updated`,
      promise: googleRequest
        .put(
          {
            customerId: customerID,
            service_account_key:
              accountKeyPlaceholder == serviceAccountKey
                ? undefined
                : serviceAccountKey,
            sync_interval: interval ? parseInt(interval) : 300,
            group_prefixes: groupPrefixes || [],
            user_group_prefixes: userGroupPrefixes || [],
          },
          `/${config.id}`,
        )
        .then(() => {
          mutate("/integrations/google-idp");
          onSuccess();
        }),
      loadingMessage: "Updating integration...",
    });
  };

  const { hasChanges } = useHasChanges([
    customerID,
    serviceAccountKey,
    interval,
    groupPrefixes,
    userGroupPrefixes,
  ]);

  return (
    <ModalContent
      maxWidthClass={cn("relative max-w-xl")}
      showClose={true}
      className={""}
      autoFocus={false}
    >
      <GradientFadedBackground />

      <IntegrationModalHeader
        image={integrationImage}
        title={"Google Workspace Configuration"}
        description={"Sync your users and groups from Google Workspace."}
      />

      <Tabs
        defaultValue={tab}
        onValueChange={(v) => setTab(v)}
        className={"mt-6"}
      >
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"settings"}>
            <Cog
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Settings
          </TabsTrigger>
          <TabsTrigger value={"group-sync"}>
            <FolderGit2
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Group Sync
          </TabsTrigger>
          <TabsTrigger value={"user-sync"}>
            <UserCircle
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            User Sync
          </TabsTrigger>
          <TabsTrigger value={"danger"}>
            <AlertOctagon
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Danger Zone
          </TabsTrigger>
        </TabsList>
        <TabsContent value={"settings"} className={"px-8 text-sm"}>
          <div className={"flex-col gap-3 flex"}>
            <Input
              type={"text"}
              autoCorrect={"off"}
              autoComplete={"off"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[165px] flex gap-2 items-center"}>
                  <Box size={16} />
                  Customer ID
                </div>
              }
              placeholder={"62d3a656-c87d-4f30-a242-5b6347e29e9f"}
              value={customerID}
              onChange={(e) => setCustomerID(e.target.value)}
            />

            <Input
              autoCorrect={"off"}
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[165px] flex gap-2 items-center"}>
                  <KeyRound size={16} />
                  Service Account Key
                </div>
              }
              placeholder={"YdV7Q~JJ62Xl.LvYoBanxZR2sJA2va_3UbqvncY8"}
              value={serviceAccountKey}
              readOnly={true}
            />

            <JSONFileUpload
              value={serviceAccountKey}
              onChange={(val) => setServiceAccountKey(btoa(val))}
            />

            <div className={"flex justify-between mt-4"}>
              <div>
                <Label>Sync Interval</Label>
                <HelpText className={"max-w-[300px]"}>
                  The interval in seconds when the synchronization should
                  happen.
                </HelpText>
              </div>
              <Input
                maxWidthClass={"max-w-[400px]"}
                placeholder={"300"}
                min={1}
                max={99999}
                value={interval}
                type={"number"}
                onChange={(e) => setInterval(e.target.value)}
                customPrefix={
                  <RefreshCw size={16} className={"text-nb-gray-300"} />
                }
                customSuffix={"Seconds"}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value={"group-sync"} className={"px-8"}>
          <div>
            <Label>
              <div className={"flex gap-2 items-center"}>
                <FolderGit2 size={16} />
                Synchronize Groups
              </div>
            </Label>
            <HelpText className={"max-w-lg mt-2"}>
              By default,{" "}
              <span className={"text-netbird font-semibold"}>All Groups</span>{" "}
              will be synchronized from your IdP to NetBird. <br />
              If you want to synchronize only groups that start with a specific
              prefix, you can add them below.
            </HelpText>
          </div>
          <GroupPrefixInput value={groupPrefixes} onChange={setGroupPrefixes} />
        </TabsContent>

        <TabsContent value={"user-sync"} className={"px-8"}>
          <div>
            <Label>
              <div className={"flex gap-2 items-center"}>
                <UserCircle size={16} />
                Synchronize Users
              </div>
            </Label>
            <HelpText className={"max-w-lg mt-2"}>
              By default,{" "}
              <span className={"text-netbird font-semibold"}>All Users</span>{" "}
              will be synchronized from your IdP to NetBird. <br />
              If you want to synchronize only users that belong to a specific
              group, you can add them below.
            </HelpText>
          </div>
          <GroupPrefixInput
            addText={"Add user group filter"}
            text={"User group starts with..."}
            value={userGroupPrefixes}
            onChange={setUserGroupPrefixes}
          />
        </TabsContent>

        <TabsContent value={"danger"} className={"px-8"}>
          <div>
            <Label>
              <div className={"flex gap-2 items-center"}>
                <AlertOctagon size={16} />
                Delete Integration
              </div>
            </Label>
            <HelpText className={"max-w-lg mt-2"}>
              Deleting this integration will remove the ability to sync users
              and groups from your IdP to NetBird. If you delete the integration
              you will need to reconfigure it again to enable the
              synchronization.
            </HelpText>
          </div>
          <Button
            variant={"danger"}
            size={"xs"}
            className={"mt-3"}
            onClick={deleteIntegration}
          >
            Delete Integration
          </Button>
        </TabsContent>
      </Tabs>
      <div className={"h-6"}></div>

      <ModalFooter className={"items-center gap-4"}>
        <ModalClose asChild={true}>
          <Button variant={"secondary"} className={"w-full"}>
            Cancel
          </Button>
        </ModalClose>

        <Button
          variant={"primary"}
          className={"w-full"}
          disabled={!hasChanges}
          onClick={updateIntegration}
        >
          Save
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
