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
  Box,
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
  ShieldCheckIcon,
} from "lucide-react";
import React, { useMemo, useReducer, useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/fleetdm.png";
import HelpText from "@/components/HelpText";
import { PeerGroupSelector } from "@/components/PeerGroupSelector";
import { Account } from "@/interfaces/Account";
import {
  DEFAULT_FLEETDM_MATCH_ATTRIBUTES,
  FleetDMIntegration,
} from "@/interfaces/EDR";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { matchAttributesReducer } from "@/modules/integrations/edr/fleetdm/FleetDM";
import { FleetDMMatchSettings } from "@/modules/integrations/edr/fleetdm/FleetDMMatchSettings";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  account: Account;
};

export default function FleetDMSetup({
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
  const fleetDMRequest = useApiCall<FleetDMIntegration>(
    "/integrations/edr/fleetdm",
  );

  const settingsRequest = useApiCall<Account>("/accounts/" + account.id);

  const [step, setStep] = useState(0);
  const maxSteps = 5;

  const [apiUrl, setApiUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [lastSyncedInterval, setLastSyncedInterval] = useState("24");

  const [matchAttributes, dispatchMatchAttributes] = useReducer(
    matchAttributesReducer,
    DEFAULT_FLEETDM_MATCH_ATTRIBUTES,
  );

  const [groups, setGroups, { save: saveGroups }] = useGroupHelper({
    initial: [],
  });

  const urlError = useMemo(() => {
    if (apiUrl === "") return "";
    if (!validator.isValidUrl(apiUrl)) {
      return "Please enter a valid url, e.g., https://fleet.example.com";
    }
    return "";
  }, [apiUrl]);

  const apiTokenEntered = !isEmpty(apiToken);
  const apiUrlEntered = !isEmpty(apiUrl);
  const allEntered = apiUrlEntered && apiTokenEntered;

  const isDisabled =
    (step == 1 && (!apiUrlEntered || urlError !== "")) ||
    (step == 2 && !allEntered) ||
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
      title: "FleetDM Integration",
      description: `FleetDM was successfully connected to NetBird.`,
      promise: fleetDMRequest
        .post({
          api_token: apiToken,
          api_url: apiUrl,
          groups: savedGroups.map((group) => group.id) || [],
          last_synced_interval: Number(lastSyncedInterval || 24),
          match_attributes: matchAttributes,
        })
        .then(() => {
          mutate("/accounts");
          mutate("/integrations/edr/fleetdm");
          onSuccess();
        }),
      loadingMessage: "Setting up integration...",
    });
  };

  const modalWidth = {
    0: "max-w-lg",
    1: "max-w-lg",
    2: "max-w-xl",
    3: "max-w-xl",
    4: "max-w-2xl",
    5: "max-w-lg",
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
        title={"Connect NetBird with FleetDM"}
        description={
          "Restrict network access to devices managed by FleetDM based on their compliance policies."
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
            Ensure that you have a{" "}
            <span className={"text-nb-gray-100 font-semibold"}>
              FleetDM account
            </span>{" "}
            with the following{" "}
            <span className={"text-nb-gray-100 font-semibold"}>
              permissions
            </span>
            .{" "}
            {
              "If you don't have the required permissions, ask your administrator to grant them to you."
            }
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
              API-only User or Admin Access
            </div>
            <div
              className={
                "py-2 px-6 flex items-center gap-2 rounded-md w-full justify-center bg-nb-gray-930/0 text-nb-gray-200"
              }
            >
              <Settings2 size={14} className={"text-sky-500"} />
              Read Access to Hosts and Policies
            </div>
          </div>
        </div>
      )}

      {step == 1 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <GlobeIcon size={18} />
            Enter your FleetDM Server URL
          </p>

          <Steps>
            <Steps.Step step={1}>
              <p>Navigate to your FleetDM Management Console.</p>
            </Steps.Step>

            <Steps.Step step={2} line={false}>
              <p>
                Copy your FleetDM server URL from the browser&apos;s address bar
                and enter it here.
              </p>
            </Steps.Step>
          </Steps>

          <div className={"mb-4"}>
            <Input
              autoFocus={true}
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"flex items-center gap-2"}>
                  <GlobeIcon size={14} />
                </div>
              }
              placeholder={"https://fleet.example.com"}
              value={apiUrl}
              error={urlError}
              onChange={(e) => setApiUrl(e.target.value)}
            />
          </div>
        </div>
      )}

      {step == 2 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Box size={20} />
            Create a FleetDM API Token
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                Log in as an admin to your Fleet instance using{" "}
                <InlineLink
                  href={"https://fleetdm.com/guides/fleetctl"}
                  target={"_blank"}
                >
                  fleetctl
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Create an{" "}
                <InlineLink
                  href={
                    "https://fleetdm.com/guides/fleetctl#create-api-only-user"
                  }
                  target={"_blank"}
                >
                  API-only user
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </p>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                Once created, paste the received API token below.
              </p>
            </Steps.Step>
          </Steps>

          <div className={"mb-4"}>
            <Input
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"flex items-center gap-2"}>
                  <KeyRound size={16} className={"text-nb-gray-300"} />
                </div>
              }
              placeholder={
                "8DD1svziNt4yFFvQ4E0ONIw8YBQ8JdHjS/lEoYgQ2aYYXGMuRrqkYKTYA+N0WEPYTQaqTcawT3OoFzcUqS5rFw=="
              }
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
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
            Select groups you want to apply the FleetDM integration to
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
            <ShieldCheckIcon size={16} />
            Compliance Requirements
          </p>
          <p className={"mt-2 !text-nb-gray-300 !leading-[1.5]"}>
            Set the specific requirements that devices must meet to be
            considered compliant.
          </p>

          <FleetDMMatchSettings
            value={matchAttributes}
            dispatch={dispatchMatchAttributes}
          />
        </div>
      )}

      {step == 5 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4 mb-3"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <RefreshCcw size={16} />
            FleetDM Sync Window
          </p>
          <div className={"mt-2 flex flex-row gap-3"}>
            <FullTooltip
              interactive={false}
              content={
                <div className={"max-w-xs text-xs"}>
                  Example: This property is set to 24 hours. Jane&apos;s laptop
                  hasn&apos;t synced with FleetDM for 27 hours. Even though
                  it&apos;s marked as Compliant in FleetDM, it will still be
                  blocked from network access.
                </div>
              }
            >
              <HelpText className={"max-w-lg"}>
                Devices not synced with FleetDM in this time won&apos;t have
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
        </div>
      )}
    </ModalContent>
  );
}
