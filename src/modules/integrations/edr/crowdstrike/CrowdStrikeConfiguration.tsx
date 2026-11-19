import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import { notify } from "@components/Notification";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { SelectDropdown } from "@components/select/SelectDropdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { useHasChanges } from "@hooks/useHasChanges";
import { IconDevicesCheck } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import {
  AlertOctagon,
  Cog,
  FolderGit2,
  GlobeIcon,
  KeyRound,
  PencilIcon,
} from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/crowdstrike.png";
import { useDialog } from "@/contexts/DialogProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { CrowdstrikeIntegration } from "@/interfaces/EDR";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { CrowdStrikeRegionsData } from "@/modules/integrations/edr/crowdstrike/CrowdStrikeRegions";
import { CrowdStrikeZtaScoreInput } from "@/modules/integrations/edr/crowdstrike/CrowdStrikeZtaScoreInput";
import { CrowdStrikeZtaToggle } from "@/modules/integrations/edr/crowdstrike/CrowdStrikeZtaToggle";
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
  config: CrowdstrikeIntegration;
};

export default function CrowdStrikeConfiguration({
  open,
  onOpenChange,
  onSuccess,
  config,
}: Props) {
  const { isLoading } = useGroups();
  return (
    !isLoading && (
      <>
        <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
          <ConfigurationContent
            onSuccess={() => {
              onOpenChange(false);
              onSuccess && onSuccess();
            }}
            config={config}
          />
        </Modal>
      </>
    )
  );
}

type ModalProps = {
  onSuccess: () => void;
  config: CrowdstrikeIntegration;
};

export function ConfigurationContent({ onSuccess, config }: ModalProps) {
  const t = useTranslations();
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const [tab, setTab] = useState<string>("peer-approval");

  const crowdStrikeRequest = useApiCall<CrowdstrikeIntegration>(
    "/integrations/edr/falcon",
    true,
  );

  const secretPlaceholder = "******************************";
  const [clientId, setClientId] = useState(secretPlaceholder);
  const [secret, setSecret] = useState(secretPlaceholder);
  const [selectedRegion, setSelectedRegion] = useState(config.cloud_id);
  const [ztaScore, setZtaScore] = useState(
    config.zta_score_threshold > 0
      ? config.zta_score_threshold.toString()
      : "80",
  );
  const [ztaEnabled, setZtaEnabled] = useState(config.zta_score_threshold > 0);
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
      title: t("integrations.edrDeleteTitle"),
      description: t("integrations.edrConfirmDeleteDescription"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      type: "danger",
    });

    if (!choice) return;

    notify({
      title: t("integrations.edrIntegrationTitle", { name: "CrowdStrike" }),
      description: t("integrations.edrIntegrationDeletedDescription", {
        name: "CrowdStrike",
      }),
      promise: crowdStrikeRequest.del().then(() => {
        mutate("/integrations/edr/falcon");
        onSuccess();
      }),
      loadingMessage: t("integrations.edrDeletingLoading"),
    });
  };

  const updateIntegration = async () => {
    const savedGroups = await saveGroups();
    const score = parseInt(ztaScore);

    notify({
      title: t("integrations.edrIntegrationTitle", { name: "CrowdStrike" }),
      description: t("integrations.edrIntegrationUpdatedDescription", {
        name: "CrowdStrike",
      }),
      promise: crowdStrikeRequest
        .put({
          zta_score_threshold:
            ztaEnabled && score > 0 && score <= 100 ? score : 0,
          cloud_id: selectedRegion,
          client_id: secretPlaceholder == clientId ? undefined : clientId,
          secret: secretPlaceholder == secret ? undefined : secret,
          groups: savedGroups.map((group) => group.id) || [],
          sync_interval: Number(syncInterval),
          enabled: config.enabled,
        })
        .then(() => {
          mutate("/integrations/edr/falcon");
          onSuccess();
        }),
      loadingMessage: t("integrations.edrUpdatingLoading"),
    });
  };

  const { hasChanges } = useHasChanges([
    groups,
    ztaScore,
    selectedRegion,
    clientId,
    secret,
    ztaEnabled,
    syncInterval,
  ]);

  const ztaError =
    ztaEnabled && (parseInt(ztaScore) <= 0 || parseInt(ztaScore) > 100)
      ? t("integrations.edrScoreRangeError")
      : undefined;
  const canSave = hasChanges && !ztaError && isValidSyncInterval(syncInterval);

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
        title={t("integrations.edrIntegrationTitle", { name: "CrowdStrike" })}
        description={t("integrations.edrCrowdStrikeConnectDescription")}
      />

      <Tabs
        defaultValue={tab}
        onValueChange={(v) => setTab(v)}
        className={"mt-6"}
      >
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"peer-approval"}>
            <IconDevicesCheck
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            {t("common.peerApproval")}
          </TabsTrigger>
          <TabsTrigger value={"settings"}>
            <Cog
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            {t("common.settings")}
          </TabsTrigger>
          <TabsTrigger value={"danger"}>
            <AlertOctagon
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            {t("common.dangerZoneTitle")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={"peer-approval"} className={"px-8"}>
          <div className={"flex flex-col gap-6"}>
            <div>
              <Label>
                <div className={"flex gap-2 items-center"}>
                  <FolderGit2 size={14} />
                  {t("common.groups")}
                </div>
              </Label>
              <HelpText className={"max-w-lg mt-2"}>
                {t("integrations.edrSelectGroupsFor", { name: "CrowdStrike" })}
              </HelpText>

              <PeerGroupSelector values={groups} onChange={setGroups} />
            </div>
            <div>
              <CrowdStrikeZtaToggle
                value={ztaEnabled}
                onChange={setZtaEnabled}
              />
              <CrowdStrikeZtaScoreInput
                enabled={ztaEnabled}
                error={ztaError}
                value={ztaScore}
                onChange={setZtaScore}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value={"settings"} className={"px-8 text-sm"}>
          <div className={"flex-col gap-6 flex"}>
            <div>
              <Label className={"mb-3"}>
                <div className={"flex gap-2 items-center"}>
                  <GlobeIcon size={14} />
                  {t("integrations.region")}
                </div>
              </Label>

              <SelectDropdown
                value={selectedRegion}
                onChange={setSelectedRegion}
                options={CrowdStrikeRegionsData}
              />
            </div>
            <div>
              <Label className={"mb-3"}>
                <div className={"flex gap-2 items-center"}>
                  <KeyRound size={14} />
                  {t("integrations.edrCrowdStrikeCredentials")}
                </div>
              </Label>
              <div className={"flex flex-col gap-3"}>
                <Input
                  autoCorrect={"off"}
                  type={"text"}
                  className={"w-full"}
                  customPrefix={
                    <div className={"min-w-[85px] flex gap-2 items-center"}>
                      <PencilIcon size={16} />
                      {t("integrations.idpClientId")}
                    </div>
                  }
                  placeholder={"9f6c80ac8a384e1d88a1fd1f279541d0"}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                />
                <Input
                  autoCorrect={"off"}
                  type={"text"}
                  className={"w-full"}
                  customPrefix={
                    <div className={"min-w-[85px] flex gap-2 items-center"}>
                      <KeyRound size={16} />
                      {t("integrations.edrSecret")}
                    </div>
                  }
                  placeholder={"qF41DKYkQJBS53w0XPVyO6v9AtZ8WMbHp72eIdml"}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                />
              </div>
            </div>
            <EDRSyncIntervalInput
              name={"CrowdStrike"}
              value={syncInterval}
              onChange={setSyncInterval}
            />
          </div>
        </TabsContent>

        <TabsContent value={"danger"} className={"px-8"}>
          <div>
            <Label>
              <div className={"flex gap-2 items-center"}>
                <AlertOctagon size={14} />
                {t("common.deleteIntegration")}
              </div>
            </Label>
            <HelpText className={"max-w-lg mt-2"}>
              {t("integrations.edrDeleteConfigWarning")}
            </HelpText>
          </div>
          <Button
            variant={"danger"}
            size={"xs"}
            className={"mt-3"}
            onClick={deleteIntegration}
          >
            {t("common.deleteIntegration")}
          </Button>
        </TabsContent>
      </Tabs>
      <div className={"h-6"}></div>

      <ModalFooter className={"items-center gap-4"}>
        <ModalClose asChild={true}>
          <Button variant={"secondary"} className={"w-full"}>
            {t("common.cancel")}
          </Button>
        </ModalClose>

        <Button
          variant={"primary"}
          className={"w-full"}
          disabled={!canSave}
          onClick={updateIntegration}
        >
          {t("common.saveChanges")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
