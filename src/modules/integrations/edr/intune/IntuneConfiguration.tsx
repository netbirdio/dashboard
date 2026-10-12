import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { Modal, ModalClose, ModalContent, ModalFooter } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { useHasChanges } from "@hooks/useHasChanges";
import { IconInfoCircle } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { AlertOctagon, Box, Cog, Folder, FolderGit2, KeyRound, RefreshCcw } from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/intune.png";
import FullTooltip from "@/components/FullTooltip";
import { PeerGroupSelector } from "@/components/PeerGroupSelector";
import { useDialog } from "@/contexts/DialogProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { IntuneIntegration } from "@/interfaces/EDR";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  config: IntuneIntegration;
};

export default function IntuneConfiguration({
  open,
  onOpenChange,
  onSuccess,
  config,
}: Props) {
  const { isLoading } = useGroups();

  return (
    !isLoading && (
      <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
        <ConfigurationContent
          onSuccess={() => {
            onOpenChange(false);
            onSuccess && onSuccess();
          }}
          config={config}
        />
      </Modal>
    )
  );
}

type ModalProps = {
  onSuccess: () => void;
  config: IntuneIntegration;
};

export function ConfigurationContent({
  onSuccess,
  config,
}: Readonly<ModalProps>) {
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();

  const [tab, setTab] = useState<string>("peer-approval");

  const intuneRequest = useApiCall<IntuneIntegration>(
    "/integrations/edr/intune",
  );

  const clientSecretPlaceholder = "******************************";
  const [clientSecret, setClientSecret] = useState(clientSecretPlaceholder);

  const [clientId, setClientId] = useState(config.client_id);
  const [tenantId, setTenantId] = useState(config.tenant_id);

  const [lastSyncedInterval, setLastSyncedInterval] = useState(
    config.last_synced_interval?.toString() || "24",
  );

  const [groups, setGroups, { save: saveGroups }] = useGroupHelper({
    initial: config.groups.map((g) => {
      const isString = typeof g === "string";
      return isString ? g : g.id;
    }) as string[],
  });

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
      title: "Intune Integration",
      description: `Intune was successfully deleted`,
      promise: intuneRequest.del({}).then(() => {
        mutate("/integrations/edr/intune");
        onSuccess();
      }),
      loadingMessage: "Deleting integration...",
    });
  };

  const updateIntegration = async () => {
    const savedGroups = await saveGroups();

    notify({
      title: "Intune Integration",
      description: `Intune was successfully updated`,
      promise: intuneRequest
        .put({
          client_id: clientId,
          tenant_id: tenantId,
          secret:
            clientSecretPlaceholder == clientSecret ? undefined : clientSecret,
          groups: savedGroups.map((group) => group.id) || [],
          last_synced_interval: Number(lastSyncedInterval || 24),
          enabled: config.enabled,
        })
        .then(() => {
          mutate("/integrations/edr/intune");
          onSuccess();
        }),
      loadingMessage: "Updating integration...",
    });
  };

  const { hasChanges } = useHasChanges([
    clientId,
    tenantId,
    clientSecret,
    groups,
    lastSyncedInterval,
  ]);
  const canSave = hasChanges && groups.length;

  return (
    <ModalContent
      maxWidthClass={cn("relative max-w-2xl")}
      showClose={true}
      className={""}
      autoFocus={false}
    >
      <GradientFadedBackground />

      <IntegrationModalHeader
        image={integrationImage}
        title={"Intune Configuration"}
        description={
          "Restrict network access to IT-managed devices marked Compliant in Intune."
        }
      />

      <Tabs
        defaultValue={tab}
        onValueChange={(v) => setTab(v)}
        className={"mt-6"}
      >
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"peer-approval"}>
            <FolderGit2
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Peer Approval
          </TabsTrigger>
          <TabsTrigger value={"sync-window"}>
            <RefreshCcw
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Intune Sync Window
          </TabsTrigger>
          <TabsTrigger value={"settings"}>
            <Cog
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Settings
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
                  Application (client) ID
                </div>
              }
              placeholder={"62d3a656-c87d-4f30-a242-5b6347e29e9f"}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
            <Input
              autoCorrect={"off"}
              autoComplete={"off"}
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[165px] flex gap-2 items-center"}>
                  <Folder size={16} />
                  Directory (tenant) ID
                </div>
              }
              placeholder={"5d60468a-65b7-45eb-a61a-53ecfbcd1ea3"}
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
            />

            <Input
              autoCorrect={"off"}
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[165px] flex gap-2 items-center"}>
                  <KeyRound size={16} />
                  Client Secret
                </div>
              }
              placeholder={"YdV7Q~JJ62Xl.LvYoBanxZR2sJA2va_3UbqvncY8"}
              value={clientSecret}
              onFocus={(e) => {
                if (e.target.value == clientSecretPlaceholder) {
                  e.target.value = "";
                }
              }}
              onBlur={(e) => {
                if (!e.target.value.length) {
                  e.target.value = clientSecretPlaceholder;
                }
              }}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </div>
        </TabsContent>

        <TabsContent value={"peer-approval"} className={"px-8"}>
          <div>
            <Label>
              <div className={"flex gap-2 items-center"}>
                <FolderGit2 size={14} />
                Groups
              </div>
            </Label>
            <HelpText className={"max-w-lg mt-2"}>
              Select groups you want to apply the Intune integration to
            </HelpText>

            <PeerGroupSelector values={groups} onChange={setGroups} />
          </div>
        </TabsContent>

        <TabsContent value={"sync-window"} className={"px-8"}>
          <div className={"mt-2 flex flex-row gap-3 w-full justify-between"}>
            <FullTooltip
              interactive={false}
              content={
                <div className={"max-w-xs text-xs"}>
                  Example: This property is set to 24 hours. Jane&apos;s laptop
                  hasn&apos;t synced with Intune for 27 hours. Even though
                  it&apos;s marked as Compliant in Intune, it will still be
                  blocked from network access
                </div>
              }
            >
              <HelpText className={"max-w-sm"}>
                Devices not synced with Intune in this time won&apos;t have
                network access.
                <IconInfoCircle
                  size={14}
                  className={"relative inline ml-1 -top-[1px]"}
                />
              </HelpText>
            </FullTooltip>
            <Input
              placeholder={"24"}
              min={24}
              max={336}
              className={"w-full min-w-[130px] ml-auto"}
              value={lastSyncedInterval}
              type={"number"}
              onChange={(e) => setLastSyncedInterval(e.target.value)}
              customSuffix={"Hours"}
            />
          </div>
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
          disabled={!canSave}
          onClick={updateIntegration}
        >
          Save
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
