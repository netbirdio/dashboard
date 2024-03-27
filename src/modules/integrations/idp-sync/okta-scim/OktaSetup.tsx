import Button from "@components/Button";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import Steps from "@components/Steps";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { Lightbox } from "@components/ui/Lightbox";
import { Mark } from "@components/ui/Mark";
import { MinimalList } from "@components/ui/MinimalList";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCirclePlus,
} from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { isEmpty } from "lodash";
import {
  Box,
  Clock4,
  FolderGit2,
  PlusCircle,
  Settings2,
  Share2,
  Shield,
  UserCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import integrationImage from "@/assets/integrations/okta.png";
import { OktaIntegration } from "@/interfaces/IdentityProvider";
import oktaGroupsAssignments from "@/modules/integrations/idp-sync/okta-scim/images/okta-groups-assignments.png";
import oktaSAMLConfig from "@/modules/integrations/idp-sync/okta-scim/images/okta-saml-configuration.png";
import oktaSCIMProvisioning from "@/modules/integrations/idp-sync/okta-scim/images/okta-scim-provisioning-enabled.png";
import oktaSCIMToApp from "@/modules/integrations/idp-sync/okta-scim/images/okta-scim-to-app-sync-enabled.png";
import oktaSyncGroups from "@/modules/integrations/idp-sync/okta-scim/images/okta-sync-groups.png";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export default function OktaSetup({ open, onOpenChange, onSuccess }: Props) {
  const [authToken, setAuthToken] = useState("");

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange}>
        {open && (
          <SetupContent
            authToken={authToken}
            setAuthToken={setAuthToken}
            onSuccess={() => {
              onOpenChange(false);
              onSuccess && onSuccess();
            }}
          />
        )}
      </Modal>
    </>
  );
}

type ModalProps = {
  onSuccess: () => void;
  authToken: string;
  setAuthToken: (token: string) => void;
};

export function SetupContent({
  onSuccess,
  authToken,
  setAuthToken,
}: ModalProps) {
  const integrationsRequest = useApiCall<OktaIntegration[]>(
    "/integrations/okta-scim-idp",
  );
  const authTokenRequest = useApiCall<OktaIntegration>(
    "/integrations/okta-scim-idp",
  ).post;

  const [step, setStep] = useState(0);
  const maxSteps = 7;

  // const [groupPrefixes, setGroupPrefixes] = useState<string[]>([]);
  // const [userGroupPrefixes, setUserGroupPrefixes] = useState<string[]>([]);

  useEffect(() => {
    const getAuthToken = async () => {
      const integration = await integrationsRequest.get();
      if (!isEmpty(integration)) {
        const integrationId = integration[0].id;
        if (authToken != "") return authToken;
        const okta = await authTokenRequest({}, `${integrationId}/token`);
        if (!okta) return "";
        return okta.auth_token;
      } else {
        const okta = await authTokenRequest({});
        if (!okta) return "";
        return okta.auth_token;
      }
    };

    getAuthToken().then((t) => setAuthToken(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ModalContent
      maxWidthClass={cn(
        "relative",
        step == 0 ? "max-w-md" : step == 4 ? "max-w-3xl" : "max-w-2xl",
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
            Create and configure Okta application
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
            <IconCirclePlus size={20} />
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
              <Lightbox image={oktaSAMLConfig} />
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                Select App type as
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
            <Share2 size={20} />
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
              <Lightbox image={oktaSCIMProvisioning} />
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 4 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Share2 size={20} />
            Enable and configure SCIM provisioning
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                Click <Mark>Provisioning</Mark> tab and under{" "}
                <Mark>SCIM connection</Mark> click
                <Mark>Edit</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Fill in the form with the following details
              </p>
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
                    value: (
                      <div className={"text-right"}>
                        Push New Users <br />
                        Push Profile Updates <br />
                        Push Groups
                      </div>
                    ),
                    noCopy: true,
                  },
                  {
                    label: "Authentication Mode",
                    value: "HTTP Header",
                    noCopy: true,
                  },
                  {
                    label: "Authorization (Bearer)",
                    value: authToken,
                  },
                ]}
              />
            </Steps.Step>
            <Steps.Step step={3}>
              <p className={"font-normal"}>
                Click on <Mark>Test Connector Configuration</Mark> to verify if
                the SCIM configuration is working. After the test is completed,
                make sure <Mark>Create Users</Mark>,{" "}
                <Mark>Update User Attributes</Mark>, and{" "}
                <Mark>Push Groups</Mark> were successful.
              </p>
            </Steps.Step>
            <Steps.Step step={4} line={false}>
              <p className={"font-normal"}>
                Click <Mark>Save</Mark>
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 5 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Box size={20} />
            Configure SCIM provisioning to NetBird
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                Go to the <Mark>Provisioning</Mark> tab, and select the{" "}
                <Mark>To App</Mark> settings and click <Mark>Edit</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                Enable <Mark>Create Users</Mark>,{" "}
                <Mark>Update User Attributes</Mark>, and{" "}
                <Mark>Deactivate Users</Mark> and click <Mark>Save</Mark>
              </p>
              <Lightbox image={oktaSCIMToApp} />
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 6 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <UserCircle size={20} />
            Assign members to NetBird
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                Go to the <Mark>Assignments</Mark> tab, select the{" "}
                <Mark>Assign</Mark> and click <Mark>Assign to Groups</Mark>
              </p>
              <Lightbox image={oktaGroupsAssignments} />
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Select the groups you want to provision, and then select{" "}
                <Mark>Assign</Mark> and click <Mark>Save and Go Back</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                Select <Mark>Done</Mark> after you have finished assigning
                groups. At this point, all members of the groups assigned to the
                application will be synced to NetBird.
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 7 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <FolderGit2 size={20} />
            Assign groups to NetBird
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                Go to the <Mark>Push Groups</Mark> tab, select{" "}
                <Mark>Push Groups</Mark> and click{" "}
                <Mark>Find groups by name</Mark>
              </p>
              <Lightbox image={oktaSyncGroups} />
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                Search groups to push and then click <Mark>Save</Mark>. The
                selected groups will then be synced to NetBird.
              </p>
            </Steps.Step>
          </Steps>
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
            disabled={authToken == ""}
          >
            {step == 0 ? "Get Started" : "Continue"}
            <IconArrowRight size={16} />
          </Button>
        )}
        {step == maxSteps && (
          <Button
            variant={"primary"}
            className={"w-full"}
            onClick={() => {
              onSuccess();
            }}
          >
            Finish Setup
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
