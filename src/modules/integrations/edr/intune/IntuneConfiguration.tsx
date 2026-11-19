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
import { useTranslations } from "@/i18n/LocaleProvider";
import { IntuneIntegration } from "@/interfaces/EDR";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import {
  DEFAULT_SYNC_INTERVAL,
  EDRSyncIntervalInput,
  isValidSyncInterval,
} from "@/modules/integrations/edr/EDRSyncIntervalInput";
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
  const translate = useTranslations();
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
  const [syncInterval, setSyncInterval] = useState(
    (config.sync_interval ?? DEFAULT_SYNC_INTERVAL).toString(),
  );

  const [groups, setGroups, { save: saveGroups }] = useGroupHelper({
    initial: config.groups.map((g) => {
      const isString = typeof g === "string";
      return isString ? g : g.id;
    }) as string[],
  });

  const deleteIntegration = async () => {
    const choice = await confirm({
      title: translate("integrations.edrDeleteTitle"),
      description: translate("integrations.edrConfirmDeleteDescription"),
      confirmText: translate("common.delete"),
      cancelText: translate("common.cancel"),
      type: "danger",
    });

    if (!choice) return;

    notify({
      title: translate("integrations.edrIntegrationTitle", { name: "Intune" }),
      description: translate("integrations.edrDeletedDescription", {
        name: "Intune",
      }),
      promise: intuneRequest.del({}).then(() => {
        mutate("/integrations/edr/intune");
        onSuccess();
      }),
      loadingMessage: translate("integrations.edrDeletingLoading"),
    });
  };

  const updateIntegration = async () => {
    const savedGroups = await saveGroups();

    notify({
      title: translate("integrations.edrIntegrationTitle", { name: "Intune" }),
      description: translate("integrations.edrUpdatedDescription", {
        name: "Intune",
      }),
      promise: intuneRequest
        .put({
          client_id: clientId,
          tenant_id: tenantId,
          secret:
            clientSecretPlaceholder == clientSecret ? undefined : clientSecret,
          groups: savedGroups.map((group) => group.id) || [],
          last_synced_interval: Number(lastSyncedInterval || 24),
          sync_interval: Number(syncInterval),
          enabled: config.enabled,
        })
        .then(() => {
          mutate("/integrations/edr/intune");
          onSuccess();
        }),
      loadingMessage: translate("integrations.edrUpdatingLoading"),
    });
  };

  const { hasChanges } = useHasChanges([
    clientId,
    tenantId,
    clientSecret,
    groups,
    lastSyncedInterval,
    syncInterval,
  ]);
  const canSave =
    hasChanges && groups.length && isValidSyncInterval(syncInterval);

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
        title={translate("integrations.edrConfigurationTitle", { name: "Intune" })}
        description={translate("integrations.edrIntuneConfigDescription")}
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
            {translate("common.peerApproval")}
          </TabsTrigger>
          <TabsTrigger value={"sync-window"}>
            <RefreshCcw
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            {translate("integrations.edrSyncWindowTitle", { name: "Intune" })}
          </TabsTrigger>
          <TabsTrigger value={"settings"}>
            <Cog
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            {translate("common.settings")}
          </TabsTrigger>
          <TabsTrigger value={"danger"}>
            <AlertOctagon
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            {translate("common.dangerZoneTitle")}
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
                  {translate("integrations.edrApplicationClientId")}
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
                  {translate("integrations.edrDirectoryTenantId")}
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
                  {translate("integrations.idpClientSecret")}
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
          <EDRSyncIntervalInput
            name={"Intune"}
            value={syncInterval}
            onChange={setSyncInterval}
            className={"mt-6"}
          />
        </TabsContent>

        <TabsContent value={"peer-approval"} className={"px-8"}>
          <div>
            <Label>
              <div className={"flex gap-2 items-center"}>
                <FolderGit2 size={14} />
                {translate("common.groups")}
              </div>
            </Label>
            <HelpText className={"max-w-lg mt-2"}>
              {translate("integrations.edrSelectGroupsFor", { name: "Intune" })}
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
                  {translate("integrations.edrSyncWindowExample", {
                    name: "Intune",
                  })}
                </div>
              }
            >
              <HelpText className={"max-w-sm"}>
                {translate("integrations.edrSyncWindowHelp", { name: "Intune" })}
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
              customSuffix={translate("integrations.edrHours")}
            />
          </div>
        </TabsContent>

        <TabsContent value={"danger"} className={"px-8"}>
          <div>
            <Label>
              <div className={"flex gap-2 items-center"}>
                <AlertOctagon size={16} />
                {translate("common.deleteIntegration")}
              </div>
            </Label>
            <HelpText className={"max-w-lg mt-2"}>
              {translate("integrations.edrDeleteIdpWarning")}
            </HelpText>
          </div>
          <Button
            variant={"danger"}
            size={"xs"}
            className={"mt-3"}
            onClick={deleteIntegration}
          >
            {translate("common.deleteIntegration")}
          </Button>
        </TabsContent>
      </Tabs>
      <div className={"h-6"}></div>

      <ModalFooter className={"items-center gap-4"}>
        <ModalClose asChild={true}>
          <Button variant={"secondary"} className={"w-full"}>
            {translate("common.cancel")}
          </Button>
        </ModalClose>

        <Button
          variant={"primary"}
          className={"w-full"}
          disabled={!canSave}
          onClick={updateIntegration}
        >
          {translate("common.save")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
