"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@components/Accordion";
import Button from "@components/Button";
import { Callout } from "@components/Callout";
import HelpText from "@components/HelpText";
import { HelpTooltip } from "@components/HelpTooltip";
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
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { useApiCall } from "@utils/api";
import { normalizeHostCIDR } from "@utils/ip";
import {
  ExternalLinkIcon,
  PlusCircle,
  ShieldCheck,
  WorkflowIcon,
} from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import {
  NetworkSelect,
  NetworkSelectOption,
} from "@/modules/networks/misc/NetworkSelect";
import NetworkModal from "@/modules/networks/NetworkModal";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
import NetworkResourceAccessControl from "@/modules/networks/resources/NetworkResourceAccessControl";
import { ResourceSingleAddressInput } from "@/modules/networks/resources/ResourceSingleAddressInput";

type Props = {
  open?: boolean;
  setOpen?: (open: boolean) => void;
  network?: Network;
  /** Lets the user pick the network of a new resource instead of fixing it to `network`. */
  networks?: Network[];
  resource?: NetworkResource;
  onCreated?: (r: NetworkResource, network: Network) => void;
  onUpdated?: (r: NetworkResource) => void;
  initialTab?: string;
};

export default function NetworkResourceModal({
  network,
  networks,
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
        networks={networks}
        resource={resource}
        onCreated={onCreated}
        onUpdated={onUpdated}
        initialTab={initialTab}
      />
    </Modal>
  );
}

export type ResourceModalResult = {
  name: string;
  description: string;
  address: string;
  groups: Group[];
};

type ModalProps = {
  onCreated?: (r: NetworkResource, network: Network) => void;
  onUpdated?: (r: NetworkResource) => void;
  /** The network the resource is in. Without it, the user picks one of `networks`. */
  network?: Network;
  networks?: Network[];
  resource?: NetworkResource;
  initialTab?: string;
  // false → no API calls: the data comes back via onSaved and the Access
  // Control tab is hidden.
  useSave?: boolean;
  onSaved?: (data: ResourceModalResult) => void;
  // Extra uniqueness names for resources that don't exist in the API yet.
  takenNames?: string[];
};

export function ResourceModalContent({
  onCreated,
  onUpdated,
  network: fixedNetwork,
  networks,
  resource,
  initialTab,
  useSave = true,
  onSaved,
  takenNames,
}: ModalProps) {
  // A lone network is preselected: there is nothing to choose between.
  const [network, setNetwork] = useState<Network | undefined>(
    fixedNetwork ?? (networks?.length === 1 ? networks[0] : undefined),
  );
  const canPickNetwork = !fixedNetwork && !resource && !!networks;
  // The caller's list is a snapshot, so networks created from this modal
  // are added to a local copy.
  const [selectableNetworks, setSelectableNetworks] = useState<Network[]>(
    networks ?? [],
  );
  const [createdIds, setCreatedIds] = useState<string[]>([]);
  const [networkModal, setNetworkModal] = useState(false);
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const canCreateNetwork = canPickNetwork && permission.networks.create;
  const networkOptions = useMemo<NetworkSelectOption[]>(
    () =>
      selectableNetworks.map((n) => ({
        value: n.id,
        name: n.name,
        description: n.description,
        isNew: createdIds.includes(n.id),
      })),
    [selectableNetworks, createdIds],
  );

  const request = useApiCall<NetworkResource>("/networks");

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

  const [policies, setPolicies] = useState<Policy[]>([]);
  const { createPoliciesForResource } = usePolicies();
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
    return allPolicies.filter((policy) => {
      const rule = policy.rules?.[0];
      if (!rule || rule.destinationResource) return false;
      const destinations = rule.destinations as (Group | string)[] | undefined;
      return destinations?.some((d) => {
        const id = typeof d === "string" ? d : d.id;
        return !!id && groupIds.has(id);
      });
    }).length;
  }, [groups, allPolicies]);

  const isAddressValid = address.length > 0 && addressError === "";

  const nameError = useMemo(() => {
    if (name === "") return "";
    // Compared case-insensitively to match resourceExists, or two drafts
    // differing only in case both validate and clash on deploy.
    const normalized = name.trim().toLowerCase();
    if (
      resourceExists(name, resource?.id) ||
      (normalized !== resource?.name?.toLowerCase() &&
        takenNames?.some((n) => n.toLowerCase() === normalized))
    )
      return "A resource with this name already exists. Please use another name.";
    return "";
  }, [name, resourceExists, resource?.id, resource?.name, takenNames]);

  const saveDraft = () => {
    onSaved?.({
      name: name.trim(),
      description,
      address: normalizeHostCIDR(address),
      groups,
    });
  };

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
    if (!network) return;
    const savedGroups = await saveGroups();
    const promise = request
      .post(
        {
          name,
          description,
          address: normalizeHostCIDR(address),
          groups: savedGroups ? savedGroups.map((g) => g.id) : undefined,
          enabled,
        },
        `/${network.id}/resources`,
      )
      .then(async (r) => {
        await createPoliciesForResource(policies, r, savedGroups);
        onCreated?.(r, network);
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
    if (!network) return;
    const savedGroups = await saveGroups();
    const promise = request
      .put(
        {
          name,
          description,
          address: normalizeHostCIDR(address),
          groups: savedGroups ? savedGroups.map((g) => g.id) : undefined,
          enabled,
        },
        `/${network.id}/resources/${resource?.id}`,
      )
      .then(async (r) => {
        await createPoliciesForResource(policies, r, savedGroups);
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
    return (
      name.length > 0 &&
      isAddressValid &&
      nameError === "" &&
      (!useSave || !!network)
    );
  }, [name, isAddressValid, nameError, useSave, network]);

  return (
    <ModalContent
      flow={useSave ? "network_resource" : undefined}
      maxWidthClass={
        tab === "access-control" ? "max-w-[790px]" : "max-w-[680px]"
      }
    >
      <ModalHeader
        icon={<WorkflowIcon size={20} />}
        title={resource ? "Edit Resource" : "Add Resource"}
        description={
          resource
            ? `${resource.name}`
            : network?.name
            ? `Give peers access to a host, subnet or domain in "${network.name}"`
            : // No network picked yet, or none on the draft canvas.
              "Give peers access to a host, subnet or domain"
        }
        color={"yellow"}
      />

      <Tabs defaultValue={tab} onValueChange={(v) => setTab(v)} value={tab}>
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"resource"}>
            <WorkflowIcon size={16} />
            Resource
          </TabsTrigger>
          {useSave && (
            <TabsTrigger
              value={"access-control"}
              disabled={!resource && !canCreate}
            >
              <ShieldCheck size={16} />
              Access Control
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value={"resource"} className={"pb-4"}>
          <div className={"px-8 flex-col flex gap-6"}>
            {canPickNetwork && (
              <div>
                <Label>Network</Label>
                <HelpText>Select the network this resource belongs to</HelpText>
                <NetworkSelect
                  value={network?.id ?? ""}
                  onChange={(id) =>
                    setNetwork(selectableNetworks.find((n) => n.id === id))
                  }
                  options={networkOptions}
                  onCreateNetwork={
                    canCreateNetwork ? () => setNetworkModal(true) : undefined
                  }
                  data-testid={"resource-network-select"}
                />
                <NetworkModal
                  open={networkModal}
                  setOpen={setNetworkModal}
                  onCreated={(created) => {
                    setSelectableNetworks((prev) => [...prev, created]);
                    setCreatedIds((prev) => [...prev, created.id]);
                    setNetwork(created);
                    mutate("/networks");
                  }}
                />
              </div>
            )}
            <div>
              <Label>Name</Label>
              <HelpText>
                Set an easily identifiable name for your resource
              </HelpText>
              <Input
                ref={nameRef}
                autoFocus={!canPickNetwork || !!network}
                tabIndex={0}
                data-testid="resource-name-input"
                placeholder={"e.g., Postgres Database"}
                value={name}
                error={nameError}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <ResourceSingleAddressInput
              value={address}
              onChange={setAddress}
              onError={setAddressError}
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

            <Accordion
              type={"multiple"}
              className={"flex flex-col gap-2 -mt-2"}
            >
              <AccordionItem value={"resource-groups"}>
                <AccordionTrigger
                  className={
                    "text-[0.8rem] tracking-wider text-nb-gray-200 py-4  my-0 leading-none gap-2 flex items-center"
                  }
                  data-testid="resource-optional-settings"
                >
                  <span className={"relative top-[1px]"}>
                    Optional Settings
                  </span>
                </AccordionTrigger>
                <AccordionContent className={""}>
                  <div className={"flex flex-col gap-6 pb-4 pt-2"}>
                    <div>
                      <Label>Description</Label>
                      <HelpText>
                        Write a short description to add more context to this
                        resource.
                      </HelpText>
                      <Input
                        placeholder={"e.g., Production, Development"}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        data-testid="resource-description-input"
                      />
                    </div>
                    <div>
                      <Label>Resource Groups</Label>
                      <HelpText className={"mt-1"}>
                        Add this resource to a group (e.g., Databases, Web
                        Servers) and reference the group <br /> in access
                        policies to simplify management.
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
                          <span className="text-sky-900 dark:text-white font-medium">
                            {groupPolicyCount} Access Control{" "}
                            {groupPolicyCount === 1 ? "Policy" : "Policies"}
                          </span>
                          . This resource will inherit access from{" "}
                          {groupPolicyCount === 1
                            ? "this policy"
                            : "these policies"}
                          .
                          {useSave && (isAddressValid || resource) ? (
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
                          ) : useSave ? (
                            " Please review them in the Access Control tab."
                          ) : (
                            // Draft has no Access Control tab.
                            " Review them on the canvas before you deploy."
                          )}
                        </Callout>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </TabsContent>

        {/* Draft never mounts this tab: its policies live in local state that
            saveDraft discards, so they would be silently lost. */}
        {useSave && (
          <TabsContent value={"access-control"} className={"pb-8"}>
            <NetworkResourceAccessControl
              existingPolicies={existingPolicies || []}
              newPolicies={policies}
              onNewPoliciesChange={setPolicies}
              address={address}
              resourceName={name}
              resourceId={resource?.id}
              hasResourceGroups={groups.length > 0}
            />
          </TabsContent>
        )}
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
          {!useSave ? (
            <>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>Cancel</Button>
              </ModalClose>
              <ModalClose asChild={true}>
                <Button
                  variant={"primary"}
                  data-testid={"submit-resource"}
                  onClick={saveDraft}
                  disabled={!canCreate}
                >
                  {resource ? "Save Changes" : "Add Resource"}
                </Button>
              </ModalClose>
            </>
          ) : !resource ? (
            <>
              {tab === "resource" && (
                <>
                  <ModalClose asChild={true}>
                    <Button variant={"secondary"}>Cancel</Button>
                  </ModalClose>
                  <Button
                    variant={"primary"}
                    data-testid="resource-continue"
                    onClick={() => setTab("access-control")}
                    disabled={!canCreate}
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
                    data-testid={"submit-resource"}
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
                data-testid={"submit-route"}
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
