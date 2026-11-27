"use client";

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
  ModalTrigger,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import Paragraph from "@components/Paragraph";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { Textarea } from "@components/Textarea";
import {
  ArrowRightLeft,
  ExternalLinkIcon,
  PlusCircle,
  Text,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy, PolicyRuleResource, Protocol } from "@/interfaces/Policy";
import { PostureCheck } from "@/interfaces/PostureCheck";
import {
  PolicyDestinationScope,
  PolicyRuleFields,
  SiteToSiteScope,
} from "@/modules/access-control/PolicyRuleFields";
import {
  isNetworkResource,
  useAccessControl,
} from "@/modules/access-control/useAccessControl";
import { PostureCheckTab } from "@/modules/posture-checks/ui/PostureCheckTab";
import { PostureCheckTabTrigger } from "@/modules/posture-checks/ui/PostureCheckTabTrigger";

type Props = {
  children?: React.ReactNode;
};

type UpdateModalProps = {
  policy: Policy;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  cell?: string;
  postureCheckTemplates?: PostureCheck[];
  onSuccess?: (policy: Policy) => void;
  useSave?: boolean;
  onBeforeSave?: () => Promise<boolean> | boolean;
  allowEditPeers?: boolean;
  additionalPeers?: Peer[];
  additionalResources?: NetworkResource[];
  siteToSiteScope?: SiteToSiteScope;
};

export default function AccessControlModal({ children }: Readonly<Props>) {
  const [modal, setModal] = useState(false);

  return (
    <Modal open={modal} onOpenChange={setModal} key={modal ? 1 : 0}>
      {children && <ModalTrigger asChild>{children}</ModalTrigger>}
      {modal && <AccessControlModalContent onSuccess={() => setModal(false)} />}
    </Modal>
  );
}

export function AccessControlUpdateModal({
  policy,
  open,
  onOpenChange,
  cell,
  postureCheckTemplates,
  onSuccess,
  useSave = true,
  onBeforeSave,
  allowEditPeers,
  additionalPeers,
  additionalResources,
  siteToSiteScope,
}: Readonly<UpdateModalProps>) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      {open && (
        <AccessControlModalContent
          onSuccess={(p) => {
            onOpenChange && onOpenChange(false);
            onSuccess && onSuccess(p);
          }}
          policy={policy}
          cell={cell}
          postureCheckTemplates={postureCheckTemplates}
          useSave={useSave}
          onBeforeSave={onBeforeSave}
          allowEditPeers={allowEditPeers}
          additionalPeers={additionalPeers}
          additionalResources={additionalResources}
          siteToSiteScope={siteToSiteScope}
        />
      )}
    </Modal>
  );
}

type ModalProps = {
  onSuccess?: (p: Policy) => void;
  policy?: Policy;
  initialSourceGroups?: Group[] | string[];
  initialDestinationGroups?: Group[] | string[];
  initialName?: string;
  initialDescription?: string;
  cell?: string;
  postureCheckTemplates?: PostureCheck[];
  useSave?: boolean;
  // Return false to abort the save (useSave mode only).
  onBeforeSave?: () => Promise<boolean> | boolean;
  allowEditPeers?: boolean;
  initialProtocol?: Protocol;
  initialPorts?: number[];
  initialSourceResource?: PolicyRuleResource;
  initialDestinationResource?: PolicyRuleResource;
  initialTab?: string;
  disableDestinationSelector?: boolean;
  additionalResources?: NetworkResource[];
  // Draft-only placeholder peers, not installed yet.
  additionalPeers?: Peer[];
  // Set when the policy is drawn onto a network in the draft canvas: the
  // destination is that network's resources only, and the policy is one-way.
  destinationScope?: PolicyDestinationScope;
  // The policy is an unsaved duplicate: show the create wizard, seeded from it.
  isDuplicate?: boolean;
  // Set for a site-to-site policy: each side picks a resource of its network.
  siteToSiteScope?: SiteToSiteScope;
};

export type {
  PolicyDestinationScope,
  SiteToSiteScope,
} from "@/modules/access-control/PolicyRuleFields";

export function AccessControlModalContent({
  onSuccess,
  policy,
  cell,
  postureCheckTemplates,
  useSave = true,
  onBeforeSave,
  allowEditPeers = false,
  initialSourceGroups,
  initialDestinationGroups,
  initialName,
  initialDescription,
  initialProtocol,
  initialPorts,
  initialSourceResource,
  initialDestinationResource,
  initialTab,
  disableDestinationSelector = false,
  additionalResources,
  additionalPeers,
  destinationScope,
  isDuplicate = false,
  siteToSiteScope,
}: Readonly<ModalProps>) {
  const { permission } = usePermissions();

  const accessControl = useAccessControl({
    policy,
    postureCheckTemplates,
    onSuccess,
    initialSourceGroups,
    initialDestinationGroups,
    initialName,
    initialDescription,
    initialPorts,
    initialProtocol,
    initialSourceResource,
    initialDestinationResource,
  });
  const {
    direction,
    sourceGroups,
    destinationGroups,
    setDirection,
    setName,
    setDescription,
    setPostureChecks,
    name,
    description,
    postureChecks,
    submit,
    isPostureChecksLoading,
    getPolicyData,
    sourceResource,
    destinationResource,
  } = accessControl;

  // A duplicate carries a policy to seed the form but is saved as a new one.
  const isCreate = !policy || isDuplicate;

  // Posture checks apply to source peers; a resource source has none.
  const showPostureChecks =
    !siteToSiteScope && !isNetworkResource(sourceResource);
  const tabAfterPolicy = showPostureChecks ? "posture_checks" : "general";

  const [tab, setTab] = useState(() => {
    if (initialTab && initialTab !== "") return initialTab;
    if (!cell) return "policy";
    if (cell == "posture_checks") return "posture_checks";
    return "policy";
  });

  const canContinueToPostureChecks = useMemo(() => {
    const hasSource = sourceGroups.length > 0 || !!sourceResource;
    const hasDestination =
      destinationGroups.length > 0 || !!destinationResource;
    return hasSource && hasDestination;
  }, [sourceGroups, destinationGroups, destinationResource, sourceResource]);

  const submitDisabled = useMemo(() => {
    if (name.length == 0) return true;
    if (!canContinueToPostureChecks) return true;
  }, [name, canContinueToPostureChecks]);

  const close = () => {
    const data = getPolicyData();
    onSuccess && onSuccess(data);
  };

  const [isSaving, setIsSaving] = useState(false);
  const saveOrClose = async () => {
    if (!useSave) return close();
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (onBeforeSave && !(await onBeforeSave())) return;
      submit();
    } finally {
      setIsSaving(false);
    }
  };

  // Resource access is never bidirectional.
  useEffect(() => {
    if (destinationScope && direction !== "in") setDirection("in");
  }, [destinationScope, direction, setDirection]);

  return (
    <ModalContent
      flow={useSave ? "policy" : undefined}
      maxWidthClass={"max-w-3xl"}
    >
      <ModalHeader
        icon={<AccessControlIcon className={"fill-current"} />}
        title={
          <span
            data-testid={
              isCreate ? "create-policy-title" : "update-policy-title"
            }
          >
            {isCreate
              ? "Create New Access Control Policy"
              : "Update Access Control Policy"}
          </span>
        }
        description={
          "Use this policy to restrict access to groups of resources."
        }
        color={"netbird"}
      />

      <Tabs defaultValue={tab} onValueChange={(v) => setTab(v)} value={tab}>
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"policy"}>
            <ArrowRightLeft size={16} />
            Policy
          </TabsTrigger>
          {showPostureChecks && (
            <PostureCheckTabTrigger disabled={!canContinueToPostureChecks} />
          )}
          <TabsTrigger value={"general"} disabled={!canContinueToPostureChecks}>
            <Text
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Name & Description
          </TabsTrigger>
        </TabsList>

        <TabsContent value={"policy"} className={"pb-8"}>
          <PolicyRuleFields
            state={accessControl}
            className={"px-8"}
            allowEditPeers={allowEditPeers}
            additionalPeers={additionalPeers}
            additionalResources={additionalResources}
            destinationScope={destinationScope}
            siteToSiteScope={siteToSiteScope}
            disableDestinationSelector={disableDestinationSelector}
            useSave={useSave}
          />
        </TabsContent>
        <PostureCheckTab
          isLoading={isPostureChecksLoading}
          postureChecks={postureChecks}
          setPostureChecks={setPostureChecks}
        />
        <TabsContent value={"general"} className={"px-8 pb-6"}>
          <div className={"flex flex-col gap-6"}>
            <div>
              <Label>Name of the Rule</Label>
              <HelpText>
                Set an easily identifiable name for your policy.
              </HelpText>
              <Input
                autoFocus={true}
                tabIndex={0}
                value={name}
                data-testid={"policy-name"}
                onChange={(e) => setName(e.target.value)}
                placeholder={"e.g., Devs to Servers"}
                disabled={
                  !permission.policies.update || !permission.policies.create
                }
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <HelpText>
                Write a short description to add more context to this policy.
              </HelpText>
              <Textarea
                value={description}
                data-testid={"policy-description"}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  "e.g., Devs are allowed to access servers and servers are allowed to access Devs."
                }
                rows={3}
                disabled={
                  !permission.policies.update || !permission.policies.create
                }
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink
              href={"https://docs.netbird.io/how-to/manage-network-access"}
              target={"_blank"}
            >
              Access Controls
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          {isCreate ? (
            <>
              {tab == "policy" && (
                <>
                  <ModalClose asChild={true}>
                    <Button variant={"secondary"}>Cancel</Button>
                  </ModalClose>
                  <Button
                    variant={"primary"}
                    onClick={() => setTab(tabAfterPolicy)}
                    disabled={!canContinueToPostureChecks}
                    data-testid="policy-continue"
                  >
                    Continue
                  </Button>
                </>
              )}

              {tab == "posture_checks" && (
                <>
                  <Button
                    variant={"secondary"}
                    onClick={() => setTab("policy")}
                  >
                    Back
                  </Button>
                  <Button
                    variant={"primary"}
                    onClick={() => setTab("general")}
                    disabled={!canContinueToPostureChecks}
                    data-testid="policy-continue"
                  >
                    Continue
                  </Button>
                </>
              )}

              {tab == "general" && (
                <>
                  <Button
                    variant={"secondary"}
                    onClick={() =>
                      setTab(showPostureChecks ? "posture_checks" : "policy")
                    }
                  >
                    Back
                  </Button>

                  <Button
                    variant={"primary"}
                    disabled={
                      submitDisabled || isSaving || !permission.policies.create
                    }
                    onClick={() => void saveOrClose()}
                    data-testid={"submit-policy"}
                  >
                    <PlusCircle size={16} />
                    Add Policy
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>Cancel</Button>
              </ModalClose>
              <Button
                variant={"primary"}
                disabled={
                  submitDisabled || isSaving || !permission.policies.update
                }
                onClick={() => void saveOrClose()}
                data-testid={"submit-policy"}
              >
                Save Changes
              </Button>
            </>
          )}
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
