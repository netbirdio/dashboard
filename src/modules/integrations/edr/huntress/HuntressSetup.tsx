import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import { SelectDropdown } from "@components/select/SelectDropdown";
import Steps from "@components/Steps";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { Lightbox } from "@components/ui/Lightbox";
import { Mark } from "@components/ui/Mark";
import { MinimalList } from "@components/ui/MinimalList";
import {
  IconArrowLeft,
  IconArrowRight,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { isEmpty } from "lodash";
import {
  Clock4,
  ExternalLinkIcon,
  FolderGit2,
  KeyRound,
  PlusCircle,
  RefreshCcw,
  Repeat,
  Settings2,
  Shield,
  ShieldCheckIcon,
} from "lucide-react";
import React, { useReducer, useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/huntress.png";
import HelpText from "@/components/HelpText";
import { PeerGroupSelector } from "@/components/PeerGroupSelector";
import { Account } from "@/interfaces/Account";
import {
  DEFAULT_HUNTRESS_MATCH_ATTRIBUTES,
  HuntressIntegration,
} from "@/interfaces/EDR";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import {
  HUNTRESS_DOCUMENTATION_URL,
  matchAttributesReducer,
} from "@/modules/integrations/edr/huntress/Huntress";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";
import { HuntressMatchSettings } from "@/modules/integrations/edr/huntress/HuntressMatchSettings";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  account: Account;
};

export default function HuntressSetup({
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
  const huntressRequest = useApiCall<HuntressIntegration>(
    "/integrations/edr/huntress",
  );

  const settingsRequest = useApiCall<Account>("/accounts/" + account.id);

  const [step, setStep] = useState(0);
  const maxSteps = 4;

  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [lastSyncedInterval, setLastSyncedInterval] = useState("24");

  const [matchAttributes, dispatchMatchAttributes] = useReducer(
    matchAttributesReducer,
    DEFAULT_HUNTRESS_MATCH_ATTRIBUTES,
  );

  const [groups, setGroups, { save: saveGroups }] = useGroupHelper({
    initial: [],
  });

  const apiSecretEntered = !isEmpty(apiSecret);
  const apiKeyEntered = !isEmpty(apiKey);
  const allEntered = apiKeyEntered && apiSecretEntered;

  const isDisabled =
    (step === 1 && !allEntered) || (step === 2 && groups.length === 0);

  const connect = async () => {
    await settingsRequest.put({
      id: account.id,
      settings: {
        ...account.settings,
        extra: {
          ...account.settings?.extra,
          peer_approval_enabled: false,
        },
      },
    });

    const savedGroups = await saveGroups();

    notify({
      title: "Huntress Integration",
      description: `Huntress was successfully connected to NetBird.`,
      promise: huntressRequest
        .post({
          api_key: apiKey,
          api_secret: apiSecret,
          groups: savedGroups.map((group) => group.id) || [],
          last_synced_interval: Number(lastSyncedInterval || 24),
          match_attributes: matchAttributes,
        })
        .then(() => {
          mutate("/accounts");
          mutate("/integrations/edr/huntress");
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
    4: "max-w-xl",
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
        title={"Connect NetBird with Huntress"}
        description={
          "Restrict network access to devices managed by Huntress based on their security posture."
        }
      />

      {step === 0 && (
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
            Ensure that you have an{" "}
            <span className={"text-nb-gray-100 font-semibold"}>
              Huntress account
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
              Create API Keys
            </div>
            <div
              className={
                "py-2 px-6 flex items-center gap-2 rounded-md w-full justify-center bg-nb-gray-930/0 text-nb-gray-200"
              }
            >
              <Settings2 size={14} className={"text-sky-500"} />
              Manage API Keys
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <KeyRound size={18} />
            Get Huntress API Credentials
          </p>

          <Steps>
            <Steps.Step step={1}>
              <p>
                Navigate to your{" "}
                <InlineLink
                  className={"inline"}
                  target={"_blank"}
                  href={"https://huntress.io/login"}
                >
                  Huntress Management Console
                </InlineLink>{" "}
                then open the menu at the top right and click{" "}
                <Mark>API Credentials</Mark>
              </p>
            </Steps.Step>

            <Steps.Step step={2}>
              <p>
                Under User API Credentials click <Mark>+ Add</Mark> then select
                your user and add
                <Mark copy={true}>NetBird</Mark> as the description
              </p>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p>Enter your API Credentials</p>
            </Steps.Step>
          </Steps>
          <div className={"mb-4 flex-col gap-4 flex"}>
            <Input
              type={"text"}
              className={"w-full"}
              customPrefix={<div className={"min-w-[80px]"}>API Key</div>}
              placeholder={"hk_30813a372c41f72f1892"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <Input
              type={"text"}
              className={"w-full"}
              customPrefix={<div className={"min-w-[80px]"}>API Secret</div>}
              placeholder={"hs_3b80d8e463aeb037ac211fafb7fc59c1"}
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4 mb-3"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <FolderGit2 size={16} />
            Peer Approval
          </p>

          <HelpText className={"max-w-lg mt-2"}>
            Select groups you want to apply the Huntress integration to
          </HelpText>

          <PeerGroupSelector values={groups} onChange={setGroups} />
        </div>
      )}

      {step === 3 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4 mb-3"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <ShieldCheckIcon size={16} />
            Compliance Requirements
          </p>
          <p className={"mt-2 !text-nb-gray-300 !leading-[1.5]"}>
            Set the specific requirements that devices must meet to be
            considered compliant. Learn more in the{" "}
            <InlineLink href={HUNTRESS_DOCUMENTATION_URL} target={"_blank"}>
              Huntress Documentation
              <ExternalLinkIcon size={12} />
            </InlineLink>{" "}
            about the different statuses.
          </p>

          <HuntressMatchSettings
            value={matchAttributes}
            dispatch={dispatchMatchAttributes}
          />
        </div>
      )}

      {step === 4 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4 mb-3"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <RefreshCcw size={16} />
            Huntress Sync Window
          </p>
          <div className={"mt-2 flex flex-row gap-3"}>
            <FullTooltip
              interactive={false}
              content={
                <div className={"max-w-xs text-xs"}>
                  Example: This property is set to 24 hours. Jane&apos;s laptop
                  hasn&apos;t synced with Huntress for 27 hours. Even though
                  it&apos;s marked as Compliant in Huntress, it will still be
                  blocked from network access.
                </div>
              }
            >
              <HelpText className={"max-w-lg"}>
                Devices not synced with Huntress in this time won&apos;t have
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
            {step === 0 ? "Get Started" : "Continue"}
            <IconArrowRight size={16} />
          </Button>
        )}
        {step === maxSteps && (
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
      {step === 0 && (
        <div
          className={
            "text-center z-0 mt-2.5 text-xs text-nb-gray-300 flex items-center justify-center gap-2 font-normal"
          }
        >
          <Clock4 size={12} />
          <div>
            Estimated setup time:
            <span className={"font-medium"}> 10-20 Minutes</span>
          </div>
        </div>
      )}
    </ModalContent>
  );
}
