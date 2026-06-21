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
import { CrowdstrikeIntegration } from "@/interfaces/EDR";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { CrowdStrikeRegionsData } from "@/modules/integrations/edr/crowdstrike/CrowdStrikeRegions";
import { CrowdStrikeZtaScoreInput } from "@/modules/integrations/edr/crowdstrike/CrowdStrikeZtaScoreInput";
import { CrowdStrikeZtaToggle } from "@/modules/integrations/edr/crowdstrike/CrowdStrikeZtaToggle";
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
      title: "CrowdStrike Integration",
      description: `CrowdStrike Integration was successfully deleted`,
      promise: crowdStrikeRequest.del().then(() => {
        mutate("/integrations/edr/falcon");
        onSuccess();
      }),
      loadingMessage: "Deleting integration...",
    });
  };

  const updateIntegration = async () => {
    const savedGroups = await saveGroups();
    const score = parseInt(ztaScore);

    notify({
      title: "CrowdStrike Integration",
      description: `CrowdStrike Integration was successfully updated`,
      promise: crowdStrikeRequest
        .put({
          zta_score_threshold:
            ztaEnabled && score > 0 && score <= 100 ? score : 0,
          cloud_id: selectedRegion,
          client_id: secretPlaceholder == clientId ? undefined : clientId,
          secret: secretPlaceholder == secret ? undefined : secret,
          groups: savedGroups.map((group) => group.id) || [],
          enabled: config.enabled,
        })
        .then(() => {
          mutate("/integrations/edr/falcon");
          onSuccess();
        }),
      loadingMessage: "Updating integration...",
    });
  };

  const { hasChanges } = useHasChanges([
    groups,
    ztaScore,
    selectedRegion,
    clientId,
    secret,
    ztaEnabled,
  ]);

  const ztaError =
    ztaEnabled && (parseInt(ztaScore) <= 0 || parseInt(ztaScore) > 100)
      ? "Score should be between 1 and 100"
      : undefined;
  const canSave = hasChanges && !ztaError;

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
        title={"CrowdStrike"}
        description={
          "Restrict network access only to devices managed by the company's IT department"
        }
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
            Peer Approval
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

        <TabsContent value={"peer-approval"} className={"px-8"}>
          <div className={"flex flex-col gap-6"}>
            <div>
              <Label>
                <div className={"flex gap-2 items-center"}>
                  <FolderGit2 size={14} />
                  Groups
                </div>
              </Label>
              <HelpText className={"max-w-lg mt-2"}>
                Select groups you want to apply the CrowdStrike integration to
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
                  Region
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
                  CrowdStrike Credentials
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
                      Client ID
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
                      Secret
                    </div>
                  }
                  placeholder={"qF41DKYkQJBS53w0XPVyO6v9AtZ8WMbHp72eIdml"}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value={"danger"} className={"px-8"}>
          <div>
            <Label>
              <div className={"flex gap-2 items-center"}>
                <AlertOctagon size={14} />
                Delete Integration
              </div>
            </Label>
            <HelpText className={"max-w-lg mt-2"}>
              Deleting this integration will remove the current configuration.
              If you delete the integration you will need to reconfigure it
              again.
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
          Save Changes
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
