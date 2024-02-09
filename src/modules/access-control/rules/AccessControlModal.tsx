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
import { notify } from "@components/Notification";
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
import PolicyDirection, { Direction } from "@components/ui/PolicyDirection";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { uniqBy } from "lodash";
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
import { useSWRConfig } from "swr";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { Group } from "@/interfaces/Group";
import { Policy, Protocol } from "@/interfaces/Policy";
import {
  PostureChecksTab,
  PostureChecksTabTrigger,
} from "@/modules/access-control/posture-checks/PostureChecksTab";
import useGroupHelper from "@/modules/groups/useGroupHelper";

type Props = {
  children?: React.ReactNode;
};

type UpdateModalProps = {
  policy: Policy;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  cell?: string;
};

export default function AccessControlModal({ children }: Props) {
  const [modal, setModal] = useState(false);

  return (
    <>
      <Modal open={modal} onOpenChange={setModal} key={modal ? 1 : 0}>
        {children && <ModalTrigger asChild>{children}</ModalTrigger>}
        {modal && (
          <AccessControlModalContent onSuccess={() => setModal(false)} />
        )}
      </Modal>
    </>
  );
}

export function AccessControlUpdateModal({
  policy,
  open,
  onOpenChange,
  cell,
}: UpdateModalProps) {
  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
        {open && (
          <AccessControlModalContent
            onSuccess={() => onOpenChange && onOpenChange(false)}
            policy={policy}
            cell={cell}
          />
        )}
      </Modal>
    </>
  );
}

type ModalProps = {
  onSuccess?: (p: Policy) => void;
  policy?: Policy;
  cell?: string;
};

export function AccessControlModalContent({
  onSuccess,
  policy,
  cell,
}: ModalProps) {
  const { updatePolicy } = usePolicies();
  const firstRule = policy?.rules ? policy.rules[0] : undefined;

  const [tab, setTab] = useState(() => {
    if (!cell) return "rule";
    if (cell == "name") return "general";
    return "rule";
  });

  const [enabled, setEnabled] = useState<boolean>(policy?.enabled ?? true);
  const [ports, setPorts] = useState<number[]>(() => {
    if (!firstRule) return [];
    if (firstRule.ports == undefined) return [];
    if (firstRule.ports.length > 0) {
      return firstRule.ports.map((p) => Number(p));
    }
    return [];
  });
  const [protocol, setProtocol] = useState<Protocol>(
    firstRule ? firstRule.protocol : "all",
  );
  const [direction, setDirection] = useState<Direction>(() => {
    if (firstRule && firstRule?.bidirectional) return "bi";
    if (firstRule && firstRule?.bidirectional == false) return "in";
    return "bi";
  });
  const [name, setName] = useState(policy?.name || "");
  const [description, setDescription] = useState(policy?.description || "");
  const { mutate } = useSWRConfig();

  const policyRequest = useApiCall<Policy>("/policies");

  const [
    sourceGroups,
    setSourceGroups,
    { getGroupsToUpdate: getSourceGroupsToUpdate },
  ] = useGroupHelper({
    initial: firstRule ? (firstRule.sources as Group[]) : [],
  });

  const [
    destinationGroups,
    setDestinationGroups,
    { getGroupsToUpdate: getDestinationGroupsToUpdate },
  ] = useGroupHelper({
    initial: firstRule ? (firstRule.destinations as Group[]) : [],
  });

  const submit = async () => {
    const g1 = getSourceGroupsToUpdate();
    const g2 = getDestinationGroupsToUpdate();
    const createOrUpdateGroups = uniqBy([...g1, ...g2], "name").map(
      (g) => g.promise,
    );
    const groups = await Promise.all(createOrUpdateGroups);

    let sources = sourceGroups
      .map((g) => {
        const find = groups.find((group) => group.name === g.name);
        return find?.id;
      })
      .filter((g) => g !== undefined) as string[];
    let destinations = destinationGroups
      .map((g) => {
        const find = groups.find((group) => group.name === g.name);
        return find?.id;
      })
      .filter((g) => g !== undefined) as string[];

    if (direction == "out") {
      const tmp = sources;
      sources = destinations;
      destinations = tmp;
    }

    const policyObj = {
      name,
      description,
      enabled,
      rules: [
        {
          bidirectional: direction == "bi",
          description,
          name,
          action: "accept",
          protocol,
          enabled,
          sources,
          destinations,
          ports: ports.length > 0 ? ports.map((p) => p.toString()) : undefined,
        },
      ],
    } as Policy;

    if (policy) {
      updatePolicy(
        policy,
        policyObj,
        () => {
          mutate("/policies");
          onSuccess && onSuccess(policy);
        },
        "The rule was successfully saved",
      );
    } else {
      notify({
        title: "Create Access Control Rule",
        description: "Rule was created successfully.",
        loadingMessage: "Creating your setup key...",
        promise: policyRequest.post(policyObj).then((policy) => {
          mutate("/policies");
          onSuccess && onSuccess(policy);
        }),
      });
    }
  };

  const portAndDirectionDisabled = protocol == "icmp" || protocol == "all";

  const buttonDisabled = useMemo(() => {
    if (sourceGroups.length == 0 || destinationGroups.length == 0) return true;
    if (name.length == 0) return true;
    if (direction != "bi" && ports.length == 0) return true;
  }, [sourceGroups, destinationGroups, direction, ports, name]);

  return (
    <ModalContent maxWidthClass={"max-w-2xl"}>
      <ModalHeader
        icon={<AccessControlIcon className={"fill-netbird"} />}
        title={
          policy
            ? "Update Access Control Rule"
            : "Create New Access Control Rule"
        }
        description={"Use this rule to restrict access to groups of resources."}
        color={"netbird"}
      />

      <Tabs defaultValue={tab} onValueChange={(v) => setTab(v)}>
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"rule"}>
            <ArrowRightLeft size={16} />
            Rule
          </TabsTrigger>
          <PostureChecksTabTrigger />
          <TabsTrigger value={"general"}>
            <Text
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Name & Description
          </TabsTrigger>
        </TabsList>

        <TabsContent value={"rule"} className={"pb-8"}>
          <div className={"px-8 flex-col flex gap-6"}>
            <div className={"flex justify-between items-center"}>
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
                onValueChange={(v) => setProtocol(v as Protocol)}
              >
                <SelectTrigger className="w-[140px]">
                  <div className={"flex items-center gap-3"}>
                    <Share2 size={15} className={"text-nb-gray-300"} />
                    <SelectValue placeholder="Select protocol..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
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
                  popoverWidth={500}
                  onChange={setSourceGroups}
                  values={sourceGroups}
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
                  popoverWidth={500}
                  onChange={setDestinationGroups}
                  values={destinationGroups}
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
                  Enable Rule
                </>
              }
              helpText={"Use this switch to enable or disable the rule."}
            />
          </div>
        </TabsContent>
        <TabsContent value={"general"} className={"px-8 pb-6"}>
          <div className={"flex flex-col gap-6"}>
            <div>
              <Label>Name of the Rule</Label>
              <HelpText>
                Set an easily identifiable name for your rule.
              </HelpText>
              <Input
                autoFocus={true}
                tabIndex={0}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={"e.g., Devs to Servers"}
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <HelpText>
                Write a short description to add more context to this rule.
              </HelpText>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  "e.g., Devs are allowed to access servers and servers are allowed to access Devs."
                }
                rows={3}
              />
            </div>
          </div>
        </TabsContent>
        <PostureChecksTab />
      </Tabs>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink
              href={
                "https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
              }
              target={"_blank"}
            >
              Access Controls
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>

          <Button
            variant={"primary"}
            disabled={buttonDisabled}
            onClick={submit}
          >
            {policy ? (
              <>Save Changes</>
            ) : (
              <>
                <PlusCircle size={16} />
                Add Rule
              </>
            )}
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
