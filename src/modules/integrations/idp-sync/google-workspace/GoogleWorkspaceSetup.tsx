import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { JSONFileUpload } from "@components/JSONFileUpload";
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
  FolderCog2,
  FolderGit2,
  KeyRound,
  Mail,
  MailPlus,
  PlusCircle,
  Repeat,
  Settings2,
  Shield,
  UserCircle,
} from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/google-workspace.png";
import { GoogleWorkspaceIntegration } from "@/interfaces/IdentityProvider";
import googleAssignServiceAccount from "@/modules/integrations/idp-sync/google-workspace/images/google-assign-service-account.png";
import googleEditServiceAccount from "@/modules/integrations/idp-sync/google-workspace/images/google-edit-service-account.png";
import googlePrivilegesReview from "@/modules/integrations/idp-sync/google-workspace/images/google-privileges-review.png";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";
import { GroupPrefixInput } from "../GroupPrefixInput";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export default function GoogleWorkspaceSetup({
  open,
  onOpenChange,
  onSuccess,
}: Props) {
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
  const googleRequest = useApiCall<GoogleWorkspaceIntegration>(
    "/integrations/google-idp",
  );

  const [step, setStep] = useState(0);
  const maxSteps = 9;

  const [serviceAccountKey, setServiceAccountKey] = useState("");
  const [customerID, setCustomerID] = useState("");
  const [serviceAccountMail, setServiceAccountMail] = useState("");

  const clientSecretEntered = !isEmpty(serviceAccountKey);
  const customerIDEntered = !isEmpty(customerID);
  const serviceAccountMailEntered = !isEmpty(serviceAccountMail);

  const allEntered =
    clientSecretEntered && customerIDEntered && serviceAccountMailEntered;

  const isDisabled =
    (step == 2 && !serviceAccountMailEntered) ||
    (step == 3 && !clientSecretEntered) ||
    (step == 7 && !customerIDEntered);

  const [groupPrefixes, setGroupPrefixes] = useState<string[]>([]);
  const [userGroupPrefixes, setUserGroupPrefixes] = useState<string[]>([]);

  const connect = async () => {
    notify({
      title: "Google Workspace Integration",
      description: `Google Workspace was successfully connected to NetBird.`,
      promise: googleRequest
        .post({
          service_account_key: btoa(serviceAccountKey), // Encode client secret to base64
          customer_id: customerID,
          group_prefixes: groupPrefixes || [],
          user_group_prefixes: userGroupPrefixes || [],
        })
        .then(() => {
          mutate("/integrations/google-idp");
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
        title={"Connect NetBird with Google Workspace"}
        description={
          "Start syncing your users and groups from Google Workspace to NetBird. Follow the steps below to get started."
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
              Google Workspace user account
            </span>{" "}
            with the following{" "}
            <span className={"text-nb-gray-100 font-semibold"}>
              permissions
            </span>
            .{" "}
            {
              "If you don't have the required permissions, ask your workspace administrator to grant them to you."
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
              Create Google Workspace applications
            </div>
            <div
              className={
                "py-2 px-6 flex items-center gap-2 rounded-md w-full justify-center bg-nb-gray-930/0 text-nb-gray-200"
              }
            >
              <Settings2 size={14} className={"text-sky-500"} />
              Manage Google Workspace applications
            </div>
          </div>
        </div>
      )}

      {step == 1 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <UserCircle size={20} />
            Create a service account
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                Navigate to{"  "}
                <InlineLink
                  className={"inline"}
                  target={"_blank"}
                  href={"https://console.cloud.google.com/apis/credentials"}
                >
                  API Credentials
                </InlineLink>
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Click <Mark>CREATE CREDENTIALS</Mark> at the top and select{" "}
                <Mark>Service account</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                Fill in the form with the following values and click{" "}
                <Mark>DONE</Mark>
              </p>
            </Steps.Step>
          </Steps>

          <MinimalList
            data={[
              {
                label: "Service account name",
                value: "NetBird",
              },
              {
                label: "Service account ID",
                value: "netbird",
              },
            ]}
          />
        </div>
      )}

      {step == 2 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Mail size={20} />
            Get your service account email
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                Navigate to{"  "}
                <InlineLink
                  className={"inline"}
                  target={"_blank"}
                  href={
                    "https://console.cloud.google.com/iam-admin/serviceaccounts"
                  }
                >
                  Service Accounts
                </InlineLink>
              </p>
            </Steps.Step>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                Click <Mark>NetBird</Mark> to edit the service account. Copy the
                service account email address.
              </p>
              <Lightbox image={googleEditServiceAccount} />
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                Enter your service account email address
              </p>
            </Steps.Step>
          </Steps>
          <div className={"mb-4"}>
            <Input
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"flex items-center gap-2"}>
                  <Mail size={16} className={"text-nb-gray-300"} />
                </div>
              }
              placeholder={"netbird@loadtests-347817.iam.gserviceaccount.com"}
              value={serviceAccountMail}
              onChange={(e) => setServiceAccountMail(e.target.value)}
            />
          </div>
        </div>
      )}

      {step == 3 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <KeyRound size={20} />
            Create service account key
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                On the same page, now click the <Mark>Keys</Mark> tab, open the{" "}
                <Mark>Add key</Mark> dropdown and select{" "}
                <Mark>Create new key</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={3}>
              <p className={"font-normal"}>
                Select <Mark>JSON</Mark> as the key type and click{" "}
                <Mark>Create</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={4} line={false}>
              <p className={"font-normal"}>
                Most browsers immediately download the new key and save it in a
                download folder on your computer. Read how to manage and secure
                your service keys{" "}
                <InlineLink
                  href={
                    "https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys#temp-locations"
                  }
                  target={"_blank"}
                >
                  here
                </InlineLink>
                .
              </p>
            </Steps.Step>
          </Steps>
          <div className={"mb-4 z-0 relative"}>
            <JSONFileUpload
              value={serviceAccountKey}
              onChange={setServiceAccountKey}
            />
            {serviceAccountKey && (
              <div className={"mt-3"}>
                <Input
                  type={"text"}
                  className={"w-full"}
                  customPrefix={
                    <div className={"flex items-center gap-2"}>
                      <KeyRound size={16} className={"text-nb-gray-300"} />
                    </div>
                  }
                  placeholder={"YdV7Q~JJ62Xl.LvYoBanxZR2sJA2va_3UbqvncY8"}
                  value={btoa(serviceAccountKey)}
                  readOnly={true}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {step == 4 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <FolderCog2 size={20} />
            Create admin role
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                Navigate to{"  "}
                <InlineLink
                  className={"inline"}
                  target={"_blank"}
                  href={"https://admin.google.com/ac/home"}
                >
                  Admin Console
                </InlineLink>
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Select <Mark>Account</Mark> on the left menu and then click{" "}
                <Mark>Admin Roles</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                Click <Mark>Create new role</Mark> and fill in the form with the
                following values
              </p>
            </Steps.Step>
          </Steps>
          <MinimalList
            data={[
              {
                label: "Name",
                value: "User and Group Management ReadOnly",
              },
              {
                label: "Description",
                value: "User and Group Management ReadOnly",
              },
            ]}
          />
        </div>
      )}

      {step == 5 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Shield size={20} />
            Add role privileges
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                Scroll down to <Mark>Admin API privileges</Mark> and add the
                following privileges to the role
              </p>
              <MinimalList
                className={"mt-2 mb-0"}
                data={[
                  {
                    label: "Users",
                    value: "Read",
                  },
                  {
                    label: "Groups",
                    value: "Read",
                  },
                ]}
              />
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                Verify preview of assigned Admin API privileges to ensure that
                everything is properly configured, and then click{" "}
                <Mark>CREATE ROLE</Mark>
              </p>
              <Lightbox image={googlePrivilegesReview} />
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 6 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <MailPlus size={20} />
            Assign service account
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                Click <Mark>Assign service accounts</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Enter your <Mark>E-Mail</Mark> and then click <Mark>ADD</Mark>
              </p>
              <MinimalList
                className={"mt-2 mb-0"}
                data={[
                  {
                    label: "E-Mail",
                    value: serviceAccountMail,
                  },
                ]}
              />
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                Click <Mark>ASSIGN ROLE</Mark>
              </p>
              <Lightbox image={googleAssignServiceAccount} />
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 7 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Box size={20} />
            Enter Customer ID
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                Navigate to{" "}
                <InlineLink
                  target={"_blank"}
                  className={"inline"}
                  href={
                    "https://admin.google.com/ac/accountsettings/profile?hl=en_US"
                  }
                >
                  Account Settings
                </InlineLink>
              </p>
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                Take note of the <Mark>Customer ID</Mark> and enter it below
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
                  Customer ID
                </div>
              }
              placeholder={"C03f4c3po"}
              value={customerID}
              onChange={(e) => setCustomerID(e.target.value)}
            />
          </div>
        </div>
      )}

      {step == 8 && (
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

      {step == 9 && (
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
            disabled={!allEntered}
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
