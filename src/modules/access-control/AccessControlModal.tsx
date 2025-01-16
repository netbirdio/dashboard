"use client";

import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
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
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { PortSelector } from "@components/PortSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { Textarea } from "@components/Textarea";
import PolicyDirection from "@components/ui/PolicyDirection";
import { cn } from "@utils/helpers";
import {
  ArrowRightLeft,
  ExternalLinkIcon,
  FolderDown,
  FolderInput,
  PlusCircle,
  Power,
  Share2,
  Shield,
  Text,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import { Group } from "@/interfaces/Group";
import { Policy, Protocol } from "@/interfaces/Policy";
import { PostureCheck } from "@/interfaces/PostureCheck";
import { useAccessControl } from "@/modules/access-control/useAccessControl";
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
  allowEditPeers?: boolean;
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
  allowEditPeers,
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
          allowEditPeers={allowEditPeers}
        />
      )}
    </Modal>
  );
}

type ModalProps = {
  onSuccess?: (p: Policy) => void;
  policy?: Policy;
  initialDestinationGroups?: Group[] | string[];
  initialName?: string;
  initialDescription?: string;
  cell?: string;
  postureCheckTemplates?: PostureCheck[];
  useSave?: boolean;
  allowEditPeers?: boolean;
};

export function AccessControlModalContent({
  onSuccess,
  policy,
  cell,
  postureCheckTemplates,
  useSave = true,
  allowEditPeers = false,
  initialDestinationGroups,
  initialName,
  initialDescription,
}: Readonly<ModalProps>) {
  const {
    portAndDirectionDisabled,
    destinationGroups,
    direction,
    ports,
    sourceGroups,
    setSourceGroups,
    setDestinationGroups,
    setPorts,
    setDirection,
    setProtocol,
    enabled,
    setEnabled,
    setName,
    setDescription,
    setPostureChecks,
    name,
    protocol,
    description,
    postureChecks,
    submit,
    isPostureChecksLoading,
    getPolicyData,
  } = useAccessControl({
    policy,
    postureCheckTemplates,
    onSuccess,
    initialDestinationGroups,
    initialName,
    initialDescription,
  });

  const [tab, setTab] = useState(() => {
    if (!cell) return "policy";
    if (cell == "posture_checks") return "posture_checks";
    if (cell == "name") return "general";
    return "policy";
  });

  const continuePostureChecksDisabled = useMemo(() => {
    if (sourceGroups.length == 0 || destinationGroups.length == 0) return true;
    if (direction != "bi" && ports.length == 0) return true;
  }, [sourceGroups, destinationGroups, direction, ports]);

  const submitDisabled = useMemo(() => {
    if (name.length == 0) return true;
    if (continuePostureChecksDisabled) return true;
  }, [name, continuePostureChecksDisabled]);

  const handleProtocolChange = (p: Protocol) => {
    setProtocol(p);
    if (p == "icmp") {
      setPorts([]);
    }
    if (p == "all") {
      setPorts([]);
    }
    if (p == "tcp" || p == "udp") {
      setDirection("in");
    }
  };

  const close = () => {
    const data = getPolicyData();
    onSuccess && onSuccess(data);
  };

  return (
    <ModalContent maxWidthClass={"max-w-3xl"}>
      <ModalHeader
        icon={<AccessControlIcon className={"fill-netbird"} />}
        title={
          policy
            ? "Update Access Control Policy"
            : "Create New Access Control Policy"
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
          <PostureCheckTabTrigger disabled={continuePostureChecksDisabled} />
          <TabsTrigger
            value={"general"}
            disabled={continuePostureChecksDisabled}
          >
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
          <div className={"px-8 flex-col flex gap-6"}>
            <div
              className={"flex justify-between items-center"}
              data-cy={"protocol-wrapper"}
            >
              <div>
                <Label>Protocol</Label>
                <HelpText className={"max-w-sm"}>
                  Allow only specified network protocols. To change traffic
                  direction and ports, select{" "}
                  <b className={"text-white"}>TCP</b> or{" "}
                  <b className={"text-white"}>UDP</b> protocol.
                </HelpText>
              </div>
              <Select
                value={protocol}
                onValueChange={(v) => handleProtocolChange(v as Protocol)}
              >
                <SelectTrigger className="w-[140px]">
                  <div
                    className={"flex items-center gap-3"}
                    data-cy={"protocol-select-button"}
                  >
                    <Share2 size={15} className={"text-nb-gray-300"} />
                    <SelectValue placeholder="Select protocol..." />
                  </div>
                </SelectTrigger>
                <SelectContent data-cy={"protocol-selection"}>
                  <SelectItem value="all">ALL</SelectItem>
                  <SelectItem value="tcp">TCP</SelectItem>
                  <SelectItem value="udp">UDP</SelectItem>
                  <SelectItem value="icmp">ICMP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={"flex gap-6 items-center"}>
              <div className={"w-full self-start"}>
                <Label className={"mb-2"}>
                  <FolderDown size={15} />
                  Source
                </Label>
                <PeerGroupSelector
                  dataCy={"source-group-selector"}
                  showPeerCount={allowEditPeers}
                  disableInlineRemoveGroup={false}
                  popoverWidth={500}
                  showRoutes={false}
                  onChange={setSourceGroups}
                  values={sourceGroups}
                  saveGroupAssignments={useSave}
                  showResourceCounter={false}
                />
              </div>
              <PolicyDirection
                value={direction}
                onChange={setDirection}
                disabled={portAndDirectionDisabled}
              />

              <div className={"w-full self-start"}>
                <Label className={"mb-2"}>
                  <FolderInput size={15} />
                  Destination
                </Label>
                <PeerGroupSelector
                  dataCy={"destination-group-selector"}
                  showRoutes={true}
                  showPeerCount={allowEditPeers}
                  disableInlineRemoveGroup={false}
                  popoverWidth={500}
                  onChange={setDestinationGroups}
                  values={destinationGroups}
                  saveGroupAssignments={useSave}
                />
              </div>
            </div>

            <div
              className={cn(
                "mb-2",
                portAndDirectionDisabled && "opacity-30 pointer-events-none",
              )}
            >
              <div>
                <Label className={"flex items-center gap-2"}>
                  <Shield size={14} />
                  Ports
                </Label>
                <HelpText>
                  Allow network traffic and access only to specified ports.
                  Select ports between 1 and 65535.
                </HelpText>
              </div>
              <div className={""}>
                <PortSelector
                  showAll={direction == "bi"}
                  values={ports}
                  onChange={setPorts}
                  disabled={portAndDirectionDisabled}
                />
              </div>
            </div>

            <FancyToggleSwitch
              value={enabled}
              onChange={setEnabled}
              label={
                <>
                  <Power size={15} />
                  Enable Policy
                </>
              }
              helpText={"Use this switch to enable or disable the policy."}
            />
          </div>
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
                data-cy={"policy-name"}
                onChange={(e) => setName(e.target.value)}
                placeholder={"e.g., Devs to Servers"}
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <HelpText>
                Write a short description to add more context to this policy.
              </HelpText>
              <Textarea
                value={description}
                data-cy={"policy-description"}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  "e.g., Devs are allowed to access servers and servers are allowed to access Devs."
                }
                rows={3}
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
          {!policy ? (
            <>
              {tab == "policy" && (
                <ModalClose asChild={true}>
                  <Button variant={"secondary"}>Cancel</Button>
                </ModalClose>
              )}

              {tab == "posture_checks" && (
                <Button variant={"secondary"} onClick={() => setTab("policy")}>
                  Back
                </Button>
              )}

              {tab == "policy" && (
                <Button
                  variant={"primary"}
                  onClick={() => setTab("posture_checks")}
                  disabled={continuePostureChecksDisabled}
                >
                  Continue
                </Button>
              )}

              {tab == "posture_checks" && (
                <Button
                  variant={"primary"}
                  onClick={() => setTab("general")}
                  disabled={continuePostureChecksDisabled}
                >
                  Continue
                </Button>
              )}

              {tab == "general" && (
                <>
                  <Button
                    variant={"secondary"}
                    onClick={() => setTab("posture_checks")}
                  >
                    Back
                  </Button>

                  <Button
                    variant={"primary"}
                    disabled={submitDisabled}
                    onClick={submit}
                    data-cy={"submit-policy"}
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
                disabled={submitDisabled}
                onClick={() => {
                  if (useSave) {
                    submit();
                  } else {
                    close();
                  }
                }}
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
