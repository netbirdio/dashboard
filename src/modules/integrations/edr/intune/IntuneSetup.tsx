import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import { notify } from "@components/Notification";
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
  Box,
  Clock4,
  Folder,
  FolderGit2,
  KeyRound,
  PlusCircle,
  RefreshCcw,
  Repeat,
  Settings2,
  Shield,
} from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/intune.png";
import FullTooltip from "@/components/FullTooltip";
import HelpText from "@/components/HelpText";
import { PeerGroupSelector } from "@/components/PeerGroupSelector";
import { Account } from "@/interfaces/Account";
import { IntuneIntegration } from "@/interfaces/EDR";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import azureGrantAdmin from "@/modules/integrations/edr/intune/images/azure-grant-admin-conset.png";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  account: Account;
};

export default function IntuneSetup({
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
  const intuneRequest = useApiCall<IntuneIntegration>(
    "/integrations/edr/intune",
  );

  const settingsRequest = useApiCall<Account>("/accounts/" + account.id);

  const [step, setStep] = useState(0);
  const maxSteps = 6;

  const [clientSecret, setClientSecret] = useState("");
  const [clientId, setClientId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [lastSyncedInterval, setLastSyncedInterval] = useState("24");

  const clientSecretEntered = !isEmpty(clientSecret);
  const clientIdEntered = !isEmpty(clientId);
  const tenantIdEntered = !isEmpty(tenantId);

  const [groups, setGroups, { save: saveGroups }] = useGroupHelper({
    initial: [],
  });

  const allEntered = clientIdEntered && tenantIdEntered && clientSecretEntered;

  const isDisabled =
    (step == 3 && !clientSecretEntered) ||
    (step == 4 && !allEntered) ||
    (step == 5 && groups.length == 0);

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
      title: "Intune Integration",
      description: `Intune was successfully connected to NetBird.`,
      promise: intuneRequest
        .post({
          secret: clientSecret,
          client_id: clientId,
          tenant_id: tenantId,
          groups: savedGroups.map((group) => group.id) || [],
          last_synced_interval: Number(lastSyncedInterval || 24),
        })
        .then(() => {
          mutate("/accounts");
          mutate("/integrations/edr/intune");
          onSuccess();
        }),
      loadingMessage: "Setting up integration...",
    });
  };

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
        title={"Connect NetBird with Intune"}
        description={
          "Restrict network access to IT-managed devices marked Compliant in Intune. Follow the steps below to get started."
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
            Ensure that you have an{" "}
            <span className={"text-nb-gray-100 font-semibold"}>
              Azure AD user account
            </span>{" "}
            with the following{" "}
            <span className={"text-nb-gray-100 font-semibold"}>
              permissions
            </span>
            .{" "}
            {
              "If you don't have the required permissions, ask your Azure AD administrator to grant them to you."
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
              Create Azure AD applications
            </div>
            <div
              className={
                "py-2 px-6 flex items-center gap-2 rounded-md w-full justify-center bg-nb-gray-930/0 text-nb-gray-200"
              }
            >
              <Settings2 size={14} className={"text-sky-500"} />
              Manage Azure AD applications
            </div>
          </div>
        </div>
      )}

      {step == 1 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Box size={20} />
            Create and configure Azure AD application
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                Navigate to{"  "}
                <InlineLink
                  className={"inline"}
                  target={"_blank"}
                  href={
                    "https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/Overview"
                  }
                >
                  Azure Active Directory
                </InlineLink>
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Click <Mark>App Registrations</Mark> in the left menu then click
                on the <Mark>+ New registration</Mark> button to create a new
                application.
              </p>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                Fill in the form with the following values and click{" "}
                <Mark>Register</Mark>
              </p>
            </Steps.Step>
          </Steps>

          <MinimalList
            data={[
              {
                label: "Name",
                value: "NetBird",
              },
              {
                label: "Account Types",
                value:
                  "Accounts in this organizational directory only (Default Directory only - Single tenant)",
              },
            ]}
          />
        </div>
      )}

      {step == 2 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Shield size={20} />
            Add API permissions
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                Click <Mark>API permissions</Mark> on the left side menu
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Click <Mark>Add a permission</Mark> then{" "}
                <Mark>Microsoft Graph</Mark> and then on the{" "}
                <Mark>Application permissions</Mark> tab.
              </p>
            </Steps.Step>
            <Steps.Step step={3}>
              <p className={"font-normal"}>
                In <Mark>Select permissions</Mark> select{" "}
                <Mark>DeviceManagementManagedDevices.Read.All</Mark> and click{" "}
                <Mark>Add permissions</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={4} line={false}>
              <p className={"font-normal"}>
                Click <Mark>Grant admin consent for Default Directory</Mark> and
                click <Mark>Yes</Mark>
              </p>
              <Lightbox image={azureGrantAdmin} />
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 3 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <KeyRound size={20} />
            Generate client secret
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                Navigate to <Mark>Certificates & secrets</Mark> on left side
                menu
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Click on <Mark>+ New client secret</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={3}>
              <p className={"font-normal"}>
                Add <Mark copy>NetBird</Mark> as the description and click{" "}
                <Mark>Add</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={4} line={false}>
              <p className={"font-normal"}>
                Copy the <Mark>Value</Mark> and paste it here
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
              placeholder={"YdV7Q~JJ62Xl.LvYoBanxZR2sJA2va_3UbqvncY8"}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </div>
        </div>
      )}

      {step == 4 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Box size={20} />
            Enter Application ID and Directory ID
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                Navigate to{" "}
                <InlineLink
                  target={"_blank"}
                  className={"inline"}
                  href={
                    "https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps"
                  }
                >
                  All applications
                </InlineLink>
              </p>
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                Select <Mark>NetBird</Mark> application in overview page and
                enter your <Mark>Application (client) ID</Mark> and{" "}
                <Mark>Directory (tenant) ID</Mark>
              </p>
            </Steps.Step>
          </Steps>
          <div className={"mb-4 flex flex-col gap-3"}>
            <Input
              type={"text"}
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
          </div>
        </div>
      )}

      {step == 5 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4 mb-3"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <FolderGit2 size={16} />
            Peer Approval
          </p>

          <HelpText className={"max-w-lg mt-2"}>
            Select groups you want to apply the Intune integration to
          </HelpText>

          <PeerGroupSelector values={groups} onChange={setGroups} />
        </div>
      )}

      {step == 6 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4 mb-3"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <RefreshCcw size={16} />
            Intune Sync Window
          </p>
          <div className={"mt-2 flex flex-row gap-3"}>
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
              <HelpText className={"max-w-lg"}>
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
            <span className={"font-medium"}> 10-20 Minutes</span>
          </div>
        </div>
      )}
    </ModalContent>
  );
}
