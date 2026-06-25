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
import { cn, validator } from "@utils/helpers";
import {
  AlertOctagon,
  Cog,
  ExternalLinkIcon,
  FolderGit2,
  GlobeIcon,
  KeyRound,
  RefreshCcw,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/workspace-one.svg";
import FullTooltip from "@/components/FullTooltip";
import { PeerGroupSelector } from "@/components/PeerGroupSelector";
import { useDialog } from "@/contexts/DialogProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { WorkspaceOneIntegration } from "@/interfaces/EDR";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  config: WorkspaceOneIntegration;
};

export default function WorkspaceOneConfiguration({
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
  config: WorkspaceOneIntegration;
};

export function ConfigurationContent({
  onSuccess,
  config,
}: Readonly<ModalProps>) {
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();

  const [tab, setTab] = useState<string>("peer-approval");

  const integrationRequest = useApiCall<WorkspaceOneIntegration>(
    "/integrations/edr/workspaceone",
  );

  const [apiUrl, setApiUrl] = useState(config.api_url || "");
  const [tokenUrl, setTokenUrl] = useState(config.token_url || "");
  const [clientId, setClientId] = useState(config.client_id || "");
  const secretPlaceholder = "******************************";
  const [clientSecret, setClientSecret] = useState(secretPlaceholder);
  const [apiKey, setApiKey] = useState(secretPlaceholder);
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
      title: "Workspace ONE Integration",
      description: `Workspace ONE was successfully deleted`,
      promise: integrationRequest.del({}).then(() => {
        mutate("/integrations/edr/workspaceone");
        onSuccess();
      }),
      loadingMessage: "Deleting integration...",
    });
  };

  const updateIntegration = async () => {
    const savedGroups = await saveGroups();

    notify({
      title: "Workspace ONE Integration",
      description: `Workspace ONE was successfully updated`,
      promise: integrationRequest
        .put({
          api_url: apiUrl,
          token_url: tokenUrl,
          client_id: clientId,
          client_secret:
            secretPlaceholder === clientSecret ? undefined : clientSecret,
          api_key: secretPlaceholder === apiKey ? undefined : apiKey,
          groups: savedGroups.map((group) => group.id) || [],
          last_synced_interval: Number(lastSyncedInterval || 24),
          enabled: config.enabled,
        })
        .then(() => {
          mutate("/integrations/edr/workspaceone");
          onSuccess();
        }),
      loadingMessage: "Updating integration...",
    });
  };

  const apiUrlError = useMemo(() => {
    if (apiUrl === "") return "";
    if (!validator.isValidUrl(apiUrl)) {
      return "Please enter a valid url, e.g., https://cn123.awmdm.com";
    }
    return "";
  }, [apiUrl]);

  const tokenUrlError = useMemo(() => {
    if (tokenUrl === "") return "";
    if (!validator.isValidUrl(tokenUrl)) {
      return "Please enter a valid OAuth token URL";
    }
    return "";
  }, [tokenUrl]);

  const { hasChanges } = useHasChanges([
    apiUrl,
    tokenUrl,
    clientId,
    clientSecret,
    apiKey,
    groups,
    lastSyncedInterval,
  ]);

  const canSave =
    hasChanges &&
    groups.length &&
    apiUrl.length &&
    tokenUrl.length &&
    clientId.length &&
    apiUrlError === "" &&
    tokenUrlError === "";

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
        title={"Workspace ONE Configuration"}
        description={
          "Restrict network access to devices based on Workspace ONE UEM compliance."
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
              Select groups you want to apply the Workspace ONE integration to
            </HelpText>

            <PeerGroupSelector
              values={groups}
              onChange={setGroups}
              showResourceCounter={false}
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
                    Example: This property is set to 24 hours. A laptop has not
                    synced with Workspace ONE for 27 hours. Even if the previous
                    state was compliant, it will be blocked from network access.
                  </div>
                }
              >
                <HelpText className={"max-w-sm mt-1"}>
                  Devices not synced with Workspace ONE in this time won&apos;t
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
            <Input
              autoCorrect={"off"}
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[165px] flex gap-2 items-center"}>
                  <GlobeIcon size={16} />
                  API URL
                </div>
              }
              placeholder={"https://cn123.awmdm.com"}
              value={apiUrl}
              error={apiUrlError}
              onChange={(e) => setApiUrl(e.target.value)}
            />
            <Input
              autoCorrect={"off"}
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[165px] flex gap-2 items-center"}>
                  <GlobeIcon size={16} />
                  Token URL
                </div>
              }
              placeholder={"https://auth.example.com/connect/token"}
              value={tokenUrl}
              error={tokenUrlError}
              onChange={(e) => setTokenUrl(e.target.value)}
            />
            <Input
              autoCorrect={"off"}
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[165px] flex gap-2 items-center"}>
                  <KeyRound size={16} />
                  Client ID
                </div>
              }
              placeholder={"OAuth client ID"}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
            <Input
              autoCorrect={"off"}
              type={"password"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[165px] flex gap-2 items-center"}>
                  <KeyRound size={16} />
                  Client Secret
                </div>
              }
              placeholder={"OAuth client secret"}
              value={clientSecret}
              onFocus={() => {
                if (clientSecret == secretPlaceholder) {
                  setClientSecret("");
                }
              }}
              onBlur={() => {
                if (!clientSecret.length) {
                  setClientSecret(secretPlaceholder);
                }
              }}
              onChange={(e) => setClientSecret(e.target.value)}
            />
            <Input
              autoCorrect={"off"}
              type={"password"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[165px] flex gap-2 items-center"}>
                  <KeyRound size={16} />
                  REST API Key
                </div>
              }
              placeholder={"Workspace ONE REST API key"}
              value={apiKey}
              onFocus={() => {
                if (apiKey == secretPlaceholder) {
                  setApiKey("");
                }
              }}
              onBlur={() => {
                if (!apiKey.length) {
                  setApiKey(secretPlaceholder);
                }
              }}
              onChange={(e) => setApiKey(e.target.value)}
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
              Deleting this integration will remove the ability to enforce
              compliance policies from Workspace ONE. If you delete the
              integration you will need to reconfigure it again.
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
              href={
                "https://www.omnissa.com/products/workspace-one-unified-endpoint-management/"
              }
              target={"_blank"}
            >
              Workspace ONE
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
