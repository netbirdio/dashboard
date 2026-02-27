"use client";

import Button from "@components/Button";
import { Callout } from "@components/Callout";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import InlineLink, { InlineButtonLink } from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { HelpTooltip } from "@components/HelpTooltip";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { useApiCall } from "@utils/api";
import { useDialog } from "@/contexts/DialogProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
import {
  ExternalLinkIcon,
  PlusCircle,
  Power,
  ShieldCheck,
  Text,
  WorkflowIcon,
} from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import NetworkResourceAccessControl from "@/modules/networks/resources/NetworkResourceAccessControl";
import { ResourceSingleAddressInput } from "@/modules/networks/resources/ResourceSingleAddressInput";
import { useSWRConfig } from "swr";

type Props = {
  open?: boolean;
  setOpen?: (open: boolean) => void;
  network: Network;
  resource?: NetworkResource;
  onCreated?: (r: NetworkResource) => void;
  onUpdated?: (r: NetworkResource) => void;
  initialTab?: string;
};

export default function NetworkResourceModal({
  network,
  open,
  setOpen,
  resource,
  onUpdated,
  onCreated,
  initialTab,
}: Props) {
  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ResourceModalContent
        key={open ? "1" : "0"}
        network={network}
        resource={resource}
        onCreated={onCreated}
        onUpdated={onUpdated}
        initialTab={initialTab}
      />
    </Modal>
  );
}

type ModalProps = {
  onCreated?: (r: NetworkResource) => void;
  onUpdated?: (r: NetworkResource) => void;
  network: Network;
  resource?: NetworkResource;
  initialTab?: string;
};

export function ResourceModalContent({
  onCreated,
  onUpdated,
  network,
  resource,
  initialTab,
}: ModalProps) {
  const create = useApiCall<NetworkResource>(
    `/networks/${network.id}/resources`,
  ).post;
  const update = useApiCall<NetworkResource>(
    `/networks/${network.id}/resources/${resource?.id}`,
  ).put;

  const { mutate } = useSWRConfig();

  const [name, setName] = useState(resource?.name || "");
  const [description, setDescription] = useState(resource?.description || "");
  const [address, setAddress] = useState(resource?.address || "");
  const [groups, setGroups, { save: saveGroups }] = useGroupHelper({
    initial: resource?.groups || [],
  });
  const [enabled, setEnabled] = useState<boolean>(
    resource ? resource.enabled : true,
  );
  const nameRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState(initialTab || "resource");
  const [addressError, setAddressError] = useState("");

  const { confirm } = useDialog();

  // Access control policies
  const [policies, setPolicies] = useState<Policy[]>([]);
  const { createPolicyForResource } = usePolicies();
  const {
    assignedPolicies,
    resourceExists,
    policies: allPolicies,
  } = useNetworksContext();

  const { policies: existingPolicies } = useMemo(
    () => assignedPolicies(resource, groups),
    [assignedPolicies, resource, groups],
  );

  const allResourcePolicies = useMemo(() => {
    return [...(existingPolicies || []), ...policies];
  }, [existingPolicies, policies]);

  const groupPolicyCount = useMemo(() => {
    if (!groups.length || !allPolicies) return 0;
    const groupIds = new Set(groups.map((g) => g.id));
    return allPolicies.filter(
      (policy) =>
        policy.rules?.some((rule) => {
          if (rule.destinationResource) return false;
          const destinations = rule.destinations as Group[] | undefined;
          return destinations?.some((d) => d.id && groupIds.has(d.id));
        }),
    ).length;
  }, [groups, allPolicies]);

  const isAddressValid = address.length > 0 && addressError === "";

  const nameError = useMemo(() => {
    if (name === "") return "";
    if (resourceExists(name, resource?.id))
      return "A resource with this name already exists. Please use another name.";
    return "";
  }, [name, resourceExists, resource?.id]);

  const confirmMissingPolicies = async () => {
    if (allResourcePolicies.length > 0) return true;
    return confirm({
      title: "No Access Control Policies Configured",
      description:
        "Without access control policies, this resource will not be accessible by any peers. You can also create policies later. Are you sure you want to continue?",
      type: "warning",
      confirmText: resource ? "Save Changes" : "Add Resource",
      cancelText: "Cancel",
      maxWidthClass: "max-w-lg",
    });
  };

  const createResource = async () => {
    if (!(await confirmMissingPolicies())) return;
    const savedGroups = await saveGroups();
    const promise = create({
      name,
      description,
      address,
      groups: savedGroups ? savedGroups.map((g) => g.id) : undefined,
      enabled,
    }).then(async (r) => {
      // Create new policies
      const newPolicies = policies.filter((p) => !p.id);
      if (newPolicies.length > 0) {
        await Promise.all(
          newPolicies.map((p) => createPolicyForResource(p, r)),
        ).then(() => {
          mutate("/policies");
        });
      }
      onCreated?.(r);
    });

    notify({
      title: "Resource Created",
      description: `The resource "${name}" has been created successfully.`,
      loadingMessage: "Creating resource...",
      promise,
    });

    return promise;
  };

  const updateResource = async () => {
    if (!(await confirmMissingPolicies())) return;
    const savedGroups = await saveGroups();
    const promise = update({
      name,
      description,
      address,
      groups: savedGroups ? savedGroups.map((g) => g.id) : undefined,
      enabled,
    }).then(async (r) => {
      const newPolicies = policies.filter((p) => !p.id);
      if (newPolicies.length > 0) {
        await Promise.all(
          newPolicies.map((p) => createPolicyForResource(p, r)),
        ).then(() => {
          mutate("/policies");
        });
      }
      onUpdated?.(r);
    });
    notify({
      title: "Resource Updated",
      description: `Resource "${name}" has been updated successfully.`,
      loadingMessage: "Updating resource...",
      promise,
    });
  };

  const canCreate = useMemo(() => {
    return name.length > 0 && isAddressValid && nameError === "";
  }, [name, isAddressValid, nameError]);

  return (
    <ModalContent
      maxWidthClass={
        tab === "access-control" ? "max-w-[790px]" : "max-w-[720px]"
      }
    >
      <ModalHeader
        icon={<WorkflowIcon size={20} />}
        title={resource ? "Edit Resource" : "Add Resource"}
        description={
          resource
            ? `${resource.name}`
            : `Add new resource to "${network?.name}"`
        }
        color={"yellow"}
      />

      <Tabs defaultValue={tab} onValueChange={(v) => setTab(v)} value={tab}>
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"resource"}>
            <WorkflowIcon size={16} />
            Resource
          </TabsTrigger>
          <TabsTrigger
            value={"access-control"}
            disabled={!resource && !isAddressValid}
          >
            <ShieldCheck size={16} />
            Access Control
          </TabsTrigger>
          <TabsTrigger
            value={"general"}
            disabled={!resource && !isAddressValid}
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

        <TabsContent value={"resource"} className={"pb-8"}>
          <div className={"px-8 flex-col flex gap-8"}>
            <ResourceSingleAddressInput
              value={address}
              onChange={setAddress}
              onError={setAddressError}
              autoFocus={true}
              description={
                <>
                  Enter a single{" "}
                  <HelpTooltip
                    content={
                      "A single host address, e.g., 10.0.0.1 or 192.168.1.5. Use this to give access to a specific machine or service."
                    }
                  >
                    IP Address
                  </HelpTooltip>
                  ,{" "}
                  <HelpTooltip
                    content={
                      "To give access to an entire subnet, use a CIDR block. For example, 10.0.0.0/24 or 192.168.1.0/24."
                    }
                  >
                    CIDR Block
                  </HelpTooltip>{" "}
                  or{" "}
                  <HelpTooltip
                    content={
                      "A DNS domain name, e.g., service.internal, example.com or *.example.com to match all subdomains."
                    }
                  >
                    Domain Name
                  </HelpTooltip>
                </>
              }
            />

            <div>
              <Label>Resource Groups (optional)</Label>
              <HelpText>
                Organize this resource into a group (e.g., Databases, Web
                Servers) and reference the group in access policies to keep
                rules reusable and easy to maintain.
              </HelpText>
              <PeerGroupSelector
                side={"top"}
                onChange={setGroups}
                values={groups}
                showPeerCounter={false}
                placeholder={"Add or select resource group(s)..."}
                policies={allPolicies}
              />
              {groupPolicyCount > 0 && (
                <Callout variant={"info"} className={"mt-3"}>
                  Your selected resource groups are used in{" "}
                  <span className="text-white font-medium">
                    {groupPolicyCount} Access Control{" "}
                    {groupPolicyCount === 1 ? "Policy" : "Policies"}
                  </span>
                  . This resource will inherit access from{" "}
                  {groupPolicyCount === 1 ? "this policy" : "these policies"}.
                  {isAddressValid || resource ? (
                    <>
                      {" "}
                      Please review them in the{" "}
                      <InlineButtonLink
                        onClick={() => setTab("access-control")}
                        variant={"dashed"}
                      >
                        Access Control
                      </InlineButtonLink>{" "}
                      tab.
                    </>
                  ) : (
                    " Please review them in the Access Control tab."
                  )}
                </Callout>
              )}
            </div>
            <FancyToggleSwitch
              value={enabled}
              onChange={setEnabled}
              label={
                <>
                  <Power size={15} />
                  Enable Resource
                </>
              }
              helpText={"Use this switch to enable or disable the resource."}
            />
          </div>
        </TabsContent>

        <TabsContent value={"access-control"} className={"pb-8"}>
          <NetworkResourceAccessControl
            existingPolicies={existingPolicies || []}
            newPolicies={policies}
            onNewPoliciesChange={setPolicies}
            address={address}
            resourceName={name}
          />
        </TabsContent>

        <TabsContent value={"general"} className={"px-8 pb-8"}>
          <div className={"flex flex-col gap-6"}>
            <div>
              <Label>Name</Label>
              <HelpText>
                Set an easily identifiable name for your resource
              </HelpText>
              <Input
                ref={nameRef}
                tabIndex={0}
                placeholder={"e.g., Postgres Database"}
                value={name}
                error={nameError}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <HelpText>
                Write a short description to add more context to this resource.
              </HelpText>
              <Input
                placeholder={"e.g., Production, Development"}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
              href={"https://docs.netbird.io/how-to/networks#resources"}
              target={"_blank"}
            >
              Resources
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          {!resource ? (
            <>
              {tab === "resource" && (
                <>
                  <ModalClose asChild={true}>
                    <Button variant={"secondary"}>Cancel</Button>
                  </ModalClose>
                  <Button
                    variant={"primary"}
                    onClick={() => setTab("access-control")}
                    disabled={!isAddressValid}
                  >
                    Continue
                  </Button>
                </>
              )}

              {tab === "access-control" && (
                <>
                  <Button
                    variant={"secondary"}
                    onClick={() => setTab("resource")}
                  >
                    Back
                  </Button>
                  <Button
                    variant={"primary"}
                    onClick={() => {
                      setTab("general");
                      setTimeout(() => nameRef.current?.focus(), 0);
                    }}
                  >
                    Continue
                  </Button>
                </>
              )}

              {tab === "general" && (
                <>
                  <Button
                    variant={"secondary"}
                    onClick={() => setTab("access-control")}
                  >
                    Back
                  </Button>
                  <Button
                    variant={"primary"}
                    data-cy={"submit-route"}
                    onClick={createResource}
                    disabled={!canCreate}
                  >
                    <PlusCircle size={16} />
                    Add Resource
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
                data-cy={"submit-route"}
                onClick={updateResource}
                disabled={!canCreate}
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
