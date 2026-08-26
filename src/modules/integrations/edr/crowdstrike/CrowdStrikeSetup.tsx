import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { SelectDropdown } from "@components/select/SelectDropdown";
import Steps from "@components/Steps";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { Mark } from "@components/ui/Mark";
import {
  IconArrowLeft,
  IconArrowRight,
  IconDevicesCheck,
} from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { isEmpty } from "lodash";
import {
  Clock4,
  ExternalLinkIcon,
  GlobeIcon,
  KeyRound,
  Repeat,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/crowdstrike.png";
import { Account } from "@/interfaces/Account";
import { CrowdstrikeIntegration } from "@/interfaces/EDR";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import {
  CrowdStrikeRegions,
  CrowdStrikeRegionsData,
} from "@/modules/integrations/edr/crowdstrike/CrowdStrikeRegions";
import { CrowdStrikeZtaScoreInput } from "@/modules/integrations/edr/crowdstrike/CrowdStrikeZtaScoreInput";
import { CrowdStrikeZtaToggle } from "@/modules/integrations/edr/crowdstrike/CrowdStrikeZtaToggle";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  account: Account;
};

export default function CrowdStrikeSetup({
  open,
  onOpenChange,
  onSuccess,
  account,
}: Props) {
  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
        <SetupContent
          account={account}
          onSuccess={() => {
            onOpenChange(false);
            onSuccess && onSuccess();
          }}
        />
      </Modal>
    </>
  );
}

type ModalProps = {
  onSuccess: () => void;
  account: Account;
};

export function SetupContent({ onSuccess, account }: ModalProps) {
  const { mutate } = useSWRConfig();
  const [step, setStep] = useState(0);
  const maxSteps = 2;

  const falconRequest = useApiCall<CrowdstrikeIntegration>(
    "/integrations/edr/falcon",
    true,
  ).post;

  const settingsRequest = useApiCall<Account>("/accounts/" + account.id);

  const [selectedRegion, setSelectedRegion] = useState(
    CrowdStrikeRegionsData[0].value,
  );
  const [groups, setGroups, { save: saveGroups }] = useGroupHelper({
    initial: [],
  });

  const [secret, setSecret] = useState("");
  const [clientId, setClientId] = useState("");

  const secretEntered = secret.length > 0 && secret != "";
  const clientIDEntered = clientId.length > 0 && clientId != "";
  const secretAndClientIDEntered = secretEntered && clientIDEntered;

  const apiPageUrl =
    CrowdStrikeRegions.find((region) => region.cloud_id == selectedRegion)
      ?.site + "/api-clients-and-keys";

  const [ztaScore, setZtaScore] = useState("80");
  const [ztaEnabled, setZtaEnabled] = useState(false);

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
    const score = parseInt(ztaScore);

    notify({
      title: "CrowdStrike Integration",
      description: `CrowdStrike was successfully connected to NetBird.`,
      promise: falconRequest({
        client_id: clientId,
        secret: secret,
        cloud_id: selectedRegion,
        groups: savedGroups.map((group) => group.id) || [],
        zta_score_threshold:
          ztaEnabled && score > 0 && score <= 100 ? score : 0,
      }).then(() => {
        mutate("/accounts");
        mutate("/integrations/edr/falcon");
        onSuccess();
      }),
      loadingMessage: "Setting up integration...",
    });
  };

  const ztaError =
    ztaEnabled && (parseInt(ztaScore) <= 0 || parseInt(ztaScore) > 100)
      ? "Score should be between 1 and 100"
      : undefined;

  const hasZtaError = ztaError != undefined;

  const isDisabled =
    (step == 1 && !secretAndClientIDEntered) || (step == 2 && isEmpty(groups));

  return (
    <ModalContent
      maxWidthClass={cn("relative", step == 0 ? "max-w-md" : "max-w-xl")}
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
        title={"Connect NetBird with CrowdStrike"}
        description={
          "Restrict network access only to devices managed by the company's IT department"
        }
      />

      {step == 0 && (
        <div className={"px-8 py-3 flex flex-col mt-4 z-0"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <GlobeIcon size={16} />
            Select your CrowdStrike region
          </p>
          <p className={"mb-3 mt-2"}>
            To identify which region you are on check your CrowdStrike dashboard
            url.
          </p>
          <SelectDropdown
            value={selectedRegion}
            onChange={setSelectedRegion}
            options={CrowdStrikeRegionsData}
          />

          <div className={"mb-3"}></div>
        </div>
      )}

      {step == 1 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4 z-0"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <KeyRound size={16} />
            Get your API Credentials
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>{"Navigate to the CrowdStrike's API Clients & Keys page"}</p>
              <div className={"flex gap-4"}>
                <Link href={apiPageUrl} passHref target={"_blank"}>
                  <Button variant={"primary"} size={"xs"}>
                    <ExternalLinkIcon size={14} />
                    API Clients & Keys
                  </Button>
                </Link>
              </div>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Click <Mark>Create API client</Mark> and enter
                <Mark copy>NetBird</Mark>
                as the client name and select <Mark>Hosts (Read)</Mark> and{" "}
                <Mark>Zero Trust Assessment (Read)</Mark> as the scope
              </p>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                Click <Mark>Create</Mark> and enter your credentials
              </p>
            </Steps.Step>
          </Steps>
          <div className={"mb-4 flex-col gap-4 flex"}>
            <Input
              type={"text"}
              className={"w-full"}
              customPrefix={<div className={"min-w-[60px]"}>Client ID</div>}
              placeholder={"9f6c80ac8a384e1d88a1fd1f279541d0"}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
            <Input
              type={"text"}
              className={"w-full"}
              customPrefix={<div className={"min-w-[60px]"}>Secret</div>}
              placeholder={"qF41DKYkQJBS53w0XPVyO6v9AtZ8WMbHp72eIdml"}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          </div>
        </div>
      )}

      {step == 2 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <IconDevicesCheck size={20} />
            Peer Approval
          </p>

          <div className={"flex flex-col gap-6"}>
            <div>
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
                value={ztaScore}
                error={ztaError}
                onChange={setZtaScore}
              />
            </div>
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
            onClick={() => setStep(step + 1)}
            disabled={isDisabled}
          >
            {step == 0 ? "Get Started" : "Continue"}
            <IconArrowRight size={16} />
          </Button>
        )}
        {step == maxSteps && (
          <Button
            variant={"primary"}
            className={"w-full"}
            onClick={connect}
            disabled={isDisabled || hasZtaError}
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
