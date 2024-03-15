import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import Steps from "@components/Steps";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { Lightbox } from "@components/ui/Lightbox";
import { Mark } from "@components/ui/Mark";
import { MinimalList } from "@components/ui/MinimalList";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { isEmpty } from "lodash";
import {
  Box,
  Clock4,
  FolderGit2,
  KeyRound,
  PlusCircle,
  Repeat,
  Settings2,
  Shield,
  UserCircle,
} from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/okta.png";
import { OktaIntegration } from "@/interfaces/IdentityProvider";
import azureGrantAdmin from "@/modules/integrations/idp-sync/azure-ad/images/azure-grant-admin-conset.png";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";
import { GroupPrefixInput } from "../GroupPrefixInput";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export default function OktaSetup({ open, onOpenChange, onSuccess }: Props) {
  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
        <SetupContent
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
};

export function SetupContent({ onSuccess }: ModalProps) {
  const { mutate } = useSWRConfig();
  const azureRequest = useApiCall<OktaIntegration>(
    "/integrations/okta-scim-idp",
  );

  const [step, setStep] = useState(0);
  const maxSteps = 6;

  const [clientSecret, setClientSecret] = useState("");
  const [clientId, setClientId] = useState("");
  const [tenantId, setTenantId] = useState("");

  const clientSecretEntered = !isEmpty(clientSecret);
  const clientIdEntered = !isEmpty(clientId);
  const tenantIdEntered = !isEmpty(tenantId);

  const allEntered = clientIdEntered && tenantIdEntered && clientSecretEntered;

  const isDisabled =
    (step == 8 && !clientSecretEntered) || (step == 9 && !allEntered);

  const [groupPrefixes, setGroupPrefixes] = useState<string[]>([]);
  const [userGroupPrefixes, setUserGroupPrefixes] = useState<string[]>([]);

  const connect = async () => {
    notify({
      title: "Okta Integration",
      description: `Okta was successfully connected to NetBird.`,
      promise: azureRequest
        .post({
          client_secret: btoa(clientSecret), // Encode client secret to base64
          client_id: clientId,
          tenant_id: tenantId,
          group_prefixes: groupPrefixes || [],
          user_group_prefixes: userGroupPrefixes || [],
        })
        .then(() => {
          mutate("/integrations/okta-scim-idp");
          onSuccess();
        }),
      loadingMessage: "Setting up integration...",
    });
  };

  return (
    <ModalContent
      maxWidthClass={cn("relative", step == 0 ? "max-w-md" : "max-w-2xl")}
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
        title={"Connect NetBird with Okta"}
        description={
          "Start syncing your users and groups from Okta to NetBird. Follow the steps below to get started."
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
            Ensure that you have an an{" "}
            <span className={"text-nb-gray-100 font-semibold"}>
              Okta user account
            </span>{" "}
            with the following{" "}
            <span className={"text-nb-gray-100 font-semibold"}>
              permissions
            </span>
            .{" "}
            {
              "If you don't have the required permissions, ask your Okta administrator to grant them to you."
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
              Add Okta applications
            </div>
            <div
              className={
                "py-2 px-6 flex items-center gap-2 rounded-md w-full justify-center bg-nb-gray-930/0 text-nb-gray-200"
              }
            >
              <Settings2 size={14} className={"text-sky-500"} />
              Configure Okta applications
            </div>
          </div>
        </div>
      )}

      {step == 1 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Box size={20} />
            Create and configure Okta SAML 2.0 application
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>Navigate to your Okta Admin Dashboard</p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Click <Mark>Applications</Mark> in the left menu then click on
                <Mark>Applications</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                Click <Mark>Create App Integration</Mark>, select{" "}
                <Mark>SAML 2.0</Mark> and click <Mark>Next</Mark>
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 2 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Shield size={20} />
            Create SAML Integration
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                Enter <Mark copy>NetBird SCIM</Mark> as the{" "}
                <Mark>App name</Mark> and click <Mark>Next</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Enter <Mark copy>http://localhost</Mark> as the Single sign-on
                URL and Audience URI (SP Entity ID) and click <Mark>Next</Mark>
              </p>
              <Lightbox image={azureGrantAdmin} />
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                Check
                <Mark>This is an internal app that we have created</Mark>
                and click <Mark>Finish</Mark>
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 3 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <KeyRound size={20} />
            Enable and configure SCIM provisioning
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>Navigate to your Okta Admin Dashboard</p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Click <Mark>Applications</Mark> in the left menu then click on
                <Mark>Applications</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={3}>
              <p className={"font-normal"}>
                Select the <Mark>NetBird SCIM</Mark> application we created
                earlier
              </p>
            </Steps.Step>
            <Steps.Step step={4}>
              <p className={"font-normal"}>
                Click <Mark>General</Mark> tab and in <Mark>App Settings</Mark>{" "}
                click <Mark>Edit</Mark> to update the settings
              </p>
            </Steps.Step>
            <Steps.Step step={5} line={false}>
              <p className={"font-normal"}>
                Tick <Mark>Enable SCIM provisioning</Mark> and click{" "}
                <Mark>Save</Mark>
              </p>
              <Lightbox image={azureGrantAdmin} />
            </Steps.Step>
          </Steps>
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
                Click <Mark>Provisioning</Mark> tab and under{" "}
                <Mark>SCIM connection</Mark> click
                <Mark>Edit</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                Fill in the form with the following details and click{" "}
                <Mark>Test Connector Configuration</Mark>
              </p>
            </Steps.Step>
          </Steps>
          <MinimalList
            data={[
              {
                label: "SCIM connector base URL",
                value: "https://api.netbird.io/api/scim/v2",
              },
              {
                label: "Unique identifier field for users",
                value: "userName",
              },
              {
                label: "Supported provisioning actions",
                value: "Push New Users, Push Profile Updates, Push Groups",
              },
              {
                label: "Authentication Mode",
                value: "HTTP Header",
              },
              {
                label: "Authorization (Bearer)",
                value: "nbs_...",
              },
            ]}
          />
        </div>
      )}

      {step == 5 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <FolderGit2 size={20} />
            Groups to be synchronized
          </p>

          <div className={"mb-4 flex flex-col gap-1"}>
            <div>
              <HelpText className={"max-w-lg mt-2 text-sm"}>
                By default,{" "}
                <span className={"text-netbird font-semibold"}>All Groups</span>{" "}
                will be synchronized from your IdP to NetBird. <br />
                If you want to synchronize only groups that start with a
                specific prefix, you can add them below.
              </HelpText>
            </div>
            <GroupPrefixInput
              value={groupPrefixes}
              onChange={setGroupPrefixes}
            />
          </div>
        </div>
      )}

      {step == 6 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <UserCircle size={18} />
            Users to be synchronized
          </p>

          <div className={"mb-4 flex flex-col gap-1"}>
            <div>
              <HelpText className={"max-w-lg mt-2 text-sm"}>
                By default,{" "}
                <span className={"text-netbird font-semibold"}>All Users</span>{" "}
                will be synchronized from your IdP to NetBird. <br />
                If you want to synchronize only users that belong to a specific
                group, you can add them below.
              </HelpText>
            </div>

            <GroupPrefixInput
              addText={"Add user group filter"}
              text={"User group starts with..."}
              value={userGroupPrefixes}
              onChange={setUserGroupPrefixes}
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
