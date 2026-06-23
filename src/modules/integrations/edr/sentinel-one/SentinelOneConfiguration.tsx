import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { useHasChanges } from "@hooks/useHasChanges";
import { IconInfoCircle } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import {
  AlertOctagon,
  Cog,
  ExternalLinkIcon,
  FolderGit2,
  GlobeIcon,
  KeyRound,
  RefreshCcw,
  ShieldCheckIcon,
} from "lucide-react";
import React, { useReducer, useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/sentinelone.png";
import FullTooltip from "@/components/FullTooltip";
import { PeerGroupSelector } from "@/components/PeerGroupSelector";
import { useDialog } from "@/contexts/DialogProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { SentinelOneIntegration } from "@/interfaces/EDR";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { matchAttributesReducer } from "@/modules/integrations/edr/sentinel-one/SentinelOne";
import { SentinelOneMatchSettings } from "@/modules/integrations/edr/sentinel-one/SentinelOneMatchSettings";
import SentinelOneUrlInput from "@/modules/integrations/edr/sentinel-one/SentinelOneUrlInput";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  config: SentinelOneIntegration;
};

export default function SentinelOneConfiguration({
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
  config: SentinelOneIntegration;
};

export function ConfigurationContent({
  onSuccess,
  config,
}: Readonly<ModalProps>) {
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();

  const [tab, setTab] = useState<string>("peer-approval");

  const integrationRequest = useApiCall<SentinelOneIntegration>(
    "/integrations/edr/sentinelone",
  );

  const [apiUrl, setApiUrl] = useState(config.api_url);
  const secretPlaceholder = "******************************";
  const [apiToken, setApiToken] = useState(secretPlaceholder);
  const [lastSyncedInterval, setLastSyncedInterval] = useState(
    config.last_synced_interval?.toString() || "24",
  );
  const [matchAttributes, dispatchMatchAttributes] = useReducer(
    matchAttributesReducer,
    config.match_attributes,
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
      title: "SentinelOne Integration",
      description: `SentinelOne was successfully deleted`,
      promise: integrationRequest.del({}).then(() => {
        mutate("/integrations/edr/sentinelone");
        onSuccess();
      }),
      loadingMessage: "Deleting integration...",
    });
  };

  const updateIntegration = async () => {
    const savedGroups = await saveGroups();

    notify({
      title: "SentinelOne Integration",
      description: `SentinelOne was successfully updated`,
      promise: integrationRequest
        .put({
          api_token: secretPlaceholder === apiToken ? undefined : apiToken,
          api_url: apiUrl,
          groups: savedGroups.map((group) => group.id) || [],
          last_synced_interval: Number(lastSyncedInterval || 24),
          match_attributes: matchAttributes,
          enabled: config.enabled,
        })
        .then(() => {
          mutate("/integrations/edr/sentinelone");
          onSuccess();
        }),
      loadingMessage: "Updating integration...",
    });
  };

  const { hasChanges } = useHasChanges([
    apiToken,
    apiUrl,
    matchAttributes,
    groups,
    lastSyncedInterval,
  ]);
  const canSave = hasChanges && groups.length;

  return (
    <ModalContent
      maxWidthClass={cn("relative max-w-[650px]")}
      showClose={true}
      className={""}
      autoFocus={false}
    >
      <GradientFadedBackground />

      <IntegrationModalHeader
        image={integrationImage}
        title={"SentinelOne Configuration"}
        description={
          "Restrict network access to IT-managed devices marked Compliant in SentinelOne."
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
              size={14}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Peer Approval
          </TabsTrigger>
          <TabsTrigger value={"compliance"}>
            <ShieldCheckIcon
              size={14}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Compliance
          </TabsTrigger>
          <TabsTrigger value={"settings"}>
            <Cog
              size={14}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Settings
          </TabsTrigger>
          <TabsTrigger value={"danger"}>
            <AlertOctagon
              size={14}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Danger Zone
          </TabsTrigger>
        </TabsList>

        <TabsContent value={"peer-approval"} className={"px-8"}>
          <div>
            <Label>
              <div className={"flex gap-2 items-center"}>
                <FolderGit2 size={14} />
                Groups
              </div>
            </Label>
            <HelpText className={"mt-2"}>
              Select groups you want to apply the SentinelOne integration to
            </HelpText>

            <PeerGroupSelector values={groups} onChange={setGroups} />
          </div>
        </TabsContent>

        <TabsContent value={"compliance"} className={"px-8"}>
          <div className={""}>
            <Label>
              <div className={"flex gap-2 items-center"}>Requirements</div>
            </Label>
            <HelpText className={"mt-2"}>
              Set the specific requirements that devices must meet to be
              considered compliant.
            </HelpText>

            <SentinelOneMatchSettings
              value={matchAttributes}
              dispatch={dispatchMatchAttributes}
            />
          </div>
        </TabsContent>

        <TabsContent value={"settings"} className={"px-8 text-sm"}>
          <div className={"mb-3 flex flex-row gap-3 w-full justify-between"}>
            <div>
              <Label>
                <div className={"flex gap-2 items-center"}>
                  <RefreshCcw size={14} />
                  Sync Window
                </div>
              </Label>
              <FullTooltip
                interactive={false}
                content={
                  <div className={"max-w-xs text-xs"}>
                    Example: This property is set to 24 hours. Jane&apos;s
                    laptop hasn&apos;t synced with SentinelOne for 27 hours.
                    Even though it&apos;s marked as Compliant in SentinelOne, it
                    will still be blocked from network access
                  </div>
                }
              >
                <HelpText className={"max-w-sm mt-1"}>
                  Devices not synced with SentinelOne in this time won&apos;t
                  have network access.
                  <IconInfoCircle
                    size={14}
                    className={"relative inline ml-1 -top-[1px]"}
                  />
                </HelpText>
              </FullTooltip>
            </div>

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

          <div className={"flex-col gap-3 flex"}>
            <SentinelOneUrlInput
              value={apiUrl}
              setValue={setApiUrl}
              errorTooltip={true}
              customPrefix={
                <div className={"min-w-[165px] flex gap-2 items-center"}>
                  <GlobeIcon size={16} />
                  Console URL
                </div>
              }
            />

            <Input
              autoCorrect={"off"}
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[165px] flex gap-2 items-center"}>
                  <KeyRound size={16} />
                  API Token
                </div>
              }
              placeholder={
                "eyJraWQiOiJ1cy1lYXN0LTEtcHJvZC0wIiwiYWxnIjoiRVMyNTYifQ.eyJzdWIiOiJzZXJ2aWNldXNlci1lYjFiNmNhNy00Y2IxLTRjNjQtYWUyZS0wMTQwMDk2YjczYTVAbWdtdC"
              }
              value={apiToken}
              onFocus={(e) => {
                if (e.target.value == secretPlaceholder) {
                  e.target.value = "";
                }
              }}
              onBlur={(e) => {
                if (!e.target.value.length) {
                  e.target.value = secretPlaceholder;
                }
              }}
              onChange={(e) => setApiToken(e.target.value)}
            />
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
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink
              href={"https://docs.netbird.io/how-to/sentinelone-edr"}
              target={"_blank"}
            >
              SentinelOne Integration
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-4"}>
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
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
