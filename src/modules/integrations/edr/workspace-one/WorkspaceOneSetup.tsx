import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import Steps from "@components/Steps";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import {
  IconArrowLeft,
  IconArrowRight,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn, validator } from "@utils/helpers";
import { isEmpty } from "lodash";
import {
  Clock4,
  ExternalLinkIcon,
  FolderGit2,
  GlobeIcon,
  KeyRound,
  PlusCircle,
  RefreshCcw,
  Repeat,
  Settings2,
  Shield,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/workspace-one.svg";
import HelpText from "@/components/HelpText";
import { PeerGroupSelector } from "@/components/PeerGroupSelector";
import { Account } from "@/interfaces/Account";
import { WorkspaceOneIntegration } from "@/interfaces/EDR";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  account: Account;
};

export default function WorkspaceOneSetup({
  open,
  onOpenChange,
  onSuccess,
  account,
}: Props) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      <SetupContent
        account={account}
        onSuccess={() => {
          onOpenChange(false);
          onSuccess && onSuccess();
        }}
      />
    </Modal>
  );
}

type ModalProps = {
  onSuccess: () => void;
  account: Account;
};

export function SetupContent({ onSuccess, account }: Readonly<ModalProps>) {
  const { mutate } = useSWRConfig();
  const integrationRequest = useApiCall<WorkspaceOneIntegration>(
    "/integrations/edr/workspaceone",
  );
  const settingsRequest = useApiCall<Account>("/accounts/" + account.id);

  const [step, setStep] = useState(0);
  const maxSteps = 4;

  const [apiUrl, setApiUrl] = useState("");
  const [tokenUrl, setTokenUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [lastSyncedInterval, setLastSyncedInterval] = useState("24");

  const [groups, setGroups, { save: saveGroups }] = useGroupHelper({
    initial: [],
  });

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

  const urlsEntered = !isEmpty(apiUrl) && !isEmpty(tokenUrl);
  const credentialsEntered =
    !isEmpty(clientId) && !isEmpty(clientSecret) && !isEmpty(apiKey);

  const isDisabled =
    (step == 1 &&
      (!urlsEntered || apiUrlError !== "" || tokenUrlError !== "")) ||
    (step == 2 && !credentialsEntered) ||
    (step == 3 && groups.length == 0);

  const connect = async () => {
    await settingsRequest.put({
      id: account.id,
      settings: {
        ...account.settings,
        peer_login_expiration_enabled:
          account?.settings?.peer_login_expiration_enabled,
        peer_login_expiration: account?.settings?.peer_login_expiration,
        extra: {
          ...account.settings?.extra,
          peer_approval_enabled: false,
        },
      },
    });

    const savedGroups = await saveGroups();

    notify({
      title: "Workspace ONE Integration",
      description: `Workspace ONE was successfully connected to NetBird.`,
      promise: integrationRequest
        .post({
          api_url: apiUrl,
          token_url: tokenUrl,
          client_id: clientId,
          client_secret: clientSecret,
          api_key: apiKey,
          groups: savedGroups.map((group) => group.id) || [],
          last_synced_interval: Number(lastSyncedInterval || 24),
        })
        .then(() => {
          mutate("/accounts");
          mutate("/integrations/edr/workspaceone");
          onSuccess();
        }),
      loadingMessage: "Setting up integration...",
    });
  };

  const modalWidth = {
    0: "max-w-lg",
    1: "max-w-xl",
    2: "max-w-xl",
    3: "max-w-xl",
    4: "max-w-lg",
  };

  return (
    <ModalContent
      maxWidthClass={cn(
        "relative",
        modalWidth[step as keyof typeof modalWidth],
      )}
      showClose={true}
      className={""}
      onEscapeKeyDown={(e) => step > 0 && e.preventDefault()}
      onInteractOutside={(e) => step > 0 && e.preventDefault()}
      onPointerDownOutside={(e) => step > 0 && e.preventDefault()}
    >
      <GradientFadedBackground />

      {step > 0 && (
        <div className={"flex gap-2 w-full items-center justify-center mb-4"}>
          {Array.from({ length: maxSteps }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-8 h-1 rounded-full bg-nb-gray-800",
                step >= index + 1 && "bg-netbird",
              )}
            />
          ))}
        </div>
      )}

      <IntegrationModalHeader
        image={integrationImage}
        title={"Connect NetBird with Workspace ONE"}
        description={
          "Restrict network access to devices that are managed and compliant in Workspace ONE UEM."
        }
      />

      {step == 0 && (
        <div
          className={
            "px-8 py-3 flex z-0 flex-col gap-0 text-sm mb-3 text-center justify-center items-center"
          }
        >
          <div
            className={
              "mt-6 text-base font-medium text-nb-gray-100 flex gap-2 items-center justify-center"
            }
          >
            <Shield size={16} />
            Required Permissions
          </div>
          <p className={"mt-2 !text-nb-gray-300 !leading-[1.5]"}>
            Ensure that you have a Workspace ONE OAuth client and REST API key
            that can read devices and compliance status.
          </p>
          <div
            className={
              "flex items-center flex-col gap-0 mt-2 w-full justify-center max-w-lg"
            }
          >
            <div
              className={
                "py-2 px-6 flex items-center gap-2 rounded-md w-full justify-center bg-nb-gray-930/0 text-nb-gray-200"
              }
            >
              <PlusCircle size={14} className={"text-sky-500"} />
              OAuth Client Credentials
            </div>
            <div
              className={
                "py-2 px-6 flex items-center gap-2 rounded-md w-full justify-center bg-nb-gray-930/0 text-nb-gray-200"
              }
            >
              <Settings2 size={14} className={"text-sky-500"} />
              Device and Compliance Read Access
            </div>
          </div>
        </div>
      )}

      {step == 1 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <GlobeIcon size={18} />
            Enter your Workspace ONE URLs
          </p>

          <Steps>
            <Steps.Step step={1}>
              <p>Copy the Workspace ONE UEM REST API base URL.</p>
            </Steps.Step>

            <Steps.Step step={2} line={false}>
              <p>Copy the OAuth token URL for the same Workspace ONE tenant.</p>
            </Steps.Step>
          </Steps>

          <div className={"mb-4 flex flex-col gap-3"}>
            <Input
              autoFocus={true}
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[115px] flex items-center gap-2"}>
                  <GlobeIcon size={14} />
                  API URL
                </div>
              }
              placeholder={"https://cn123.awmdm.com"}
              value={apiUrl}
              error={apiUrlError}
              onChange={(e) => setApiUrl(e.target.value)}
            />
            <Input
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[115px] flex items-center gap-2"}>
                  <GlobeIcon size={14} />
                  Token URL
                </div>
              }
              placeholder={"https://auth.example.com/connect/token"}
              value={tokenUrl}
              error={tokenUrlError}
              onChange={(e) => setTokenUrl(e.target.value)}
            />
          </div>
        </div>
      )}

      {step == 2 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <KeyRound size={20} />
            Enter Workspace ONE credentials
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                Create or select an OAuth client in Workspace ONE with device
                read access.
              </p>
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                Paste the client credentials and REST API key below.
              </p>
            </Steps.Step>
          </Steps>

          <div className={"mb-4 flex flex-col gap-3"}>
            <Input
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[135px] flex items-center gap-2"}>
                  <KeyRound size={16} className={"text-nb-gray-300"} />
                  Client ID
                </div>
              }
              placeholder={"OAuth client ID"}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
            <Input
              type={"password"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[135px] flex items-center gap-2"}>
                  <KeyRound size={16} className={"text-nb-gray-300"} />
                  Client Secret
                </div>
              }
              placeholder={"OAuth client secret"}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
            <Input
              type={"password"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[135px] flex items-center gap-2"}>
                  <KeyRound size={16} className={"text-nb-gray-300"} />
                  REST API Key
                </div>
              }
              placeholder={"Workspace ONE REST API key"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>
      )}

      {step == 3 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4 mb-3"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <FolderGit2 size={16} />
            Peer Approval
          </p>

          <HelpText className={"max-w-lg mt-2"}>
            Select groups you want to apply the Workspace ONE integration to
          </HelpText>

          <PeerGroupSelector
            values={groups}
            onChange={setGroups}
            showResourceCounter={false}
          />
        </div>
      )}

      {step == 4 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4 mb-3"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <RefreshCcw size={16} />
            Workspace ONE Sync Window
          </p>
          <div className={"mt-2 flex flex-row gap-3"}>
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
              <HelpText className={"max-w-lg"}>
                Devices not synced with Workspace ONE in this time won&apos;t
                have network access.
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
              className={"w-full min-w-[130px]"}
              value={lastSyncedInterval}
              type={"number"}
              onChange={(e) => setLastSyncedInterval(e.target.value)}
              customSuffix={"Hours"}
            />
          </div>
        </div>
      )}

      <ModalFooter className={"items-center gap-4"}>
        {step > 0 && (
          <Button
            variant={"secondary"}
            className={"w-full"}
            onClick={() => setStep(step - 1)}
          >
            <IconArrowLeft size={16} />
            Back
          </Button>
        )}
        {step >= 0 && step < maxSteps && (
          <Button
            variant={"primary"}
            className={"w-full"}
            disabled={isDisabled}
            onClick={() => setStep(step + 1)}
          >
            {step == 0 ? "Get Started" : "Continue"}
            <IconArrowRight size={16} />
          </Button>
        )}
        {step == maxSteps && (
          <Button
            variant={"primary"}
            className={"w-full"}
            disabled={isDisabled}
            onClick={connect}
          >
            <Repeat size={16} />
            Connect
          </Button>
        )}
      </ModalFooter>
      {step == 0 && (
        <div
          className={
            "text-center z-0 mt-2.5 text-xs text-nb-gray-300 flex items-center justify-center gap-2 font-normal"
          }
        >
          <Clock4 size={12} />
          <div>
            Estimated setup time:
            <span className={"font-medium"}> 5-10 Minutes</span>
          </div>
          <InlineLink
            href={
              "https://www.omnissa.com/products/workspace-one-unified-endpoint-management/"
            }
            target={"_blank"}
          >
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </div>
      )}
    </ModalContent>
  );
}
