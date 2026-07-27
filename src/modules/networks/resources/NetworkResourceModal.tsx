"use client";

import Button from "@components/Button";
import { Callout } from "@components/Callout";
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
import { useTranslations } from "next-intl";
import { useApiCall } from "@utils/api";
import { normalizeHostCIDR } from "@utils/ip";
import { useDialog } from "@/contexts/DialogProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
import {
  ExternalLinkIcon,
  PlusCircle,
  ShieldCheck,
  WorkflowIcon,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@components/Accordion";
import React, { useMemo, useRef, useState } from "react";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import NetworkResourceAccessControl from "@/modules/networks/resources/NetworkResourceAccessControl";
import { ResourceSingleAddressInput } from "@/modules/networks/resources/ResourceSingleAddressInput";

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
  const t = useTranslations("networks");
  const tCommon = useTranslations("common");
  const create = useApiCall<NetworkResource>(
    `/networks/${network.id}/resources`,
  ).post;
  const update = useApiCall<NetworkResource>(
    `/networks/${network.id}/resources/${resource?.id}`,
  ).put;

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
    if (resourceExists(name, resource?.id))
      return t("nameAlreadyExists");
    return "";
  }, [name, resourceExists, resource?.id, t]);

  const confirmMissingPolicies = async () => {
    if (allResourcePolicies.length > 0) return true;
    return confirm({
      title: t("noPoliciesConfirmTitle"),
      description:
        t("noPoliciesConfirmDesc"),
      type: "warning",
      confirmText: resource ? t("saveChanges") : t("addResource"),
      cancelText: tCommon("cancel"),
      maxWidthClass: "max-w-lg",
    });
  };

  const createResource = async () => {
    if (!(await confirmMissingPolicies())) return;
    const savedGroups = await saveGroups();
    const promise = create({
      name,
      description,
      address: normalizeHostCIDR(address),
      groups: savedGroups ? savedGroups.map((g) => g.id) : undefined,
      enabled,
    }).then(async (r) => {
      await createPoliciesForResource(policies, r, savedGroups);
      onCreated?.(r);
    });

    notify({
      title: t("resourceCreated"),
      description: t("resourceCreatedDesc", { name }),
      loadingMessage: t("resourceCreating"),
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
      address: normalizeHostCIDR(address),
      groups: savedGroups ? savedGroups.map((g) => g.id) : undefined,
      enabled,
    }).then(async (r) => {
      await createPoliciesForResource(policies, r, savedGroups);
      onUpdated?.(r);
    });
    notify({
      title: t("resourceUpdated"),
      description: t("resourceUpdatedDesc", { name }),
      loadingMessage: t("resourceUpdating"),
      promise,
    });
  };

  const canCreate = useMemo(() => {
    return name.length > 0 && isAddressValid && nameError === "";
  }, [name, isAddressValid, nameError]);

  return (
    <ModalContent
      maxWidthClass={
        tab === "access-control" ? "max-w-[790px]" : "max-w-[680px]"
      }
    >
      <ModalHeader
        icon={<WorkflowIcon size={20} />}
        title={resource ? t("editResourceBtn") : t("addResource")}
        description={
          resource
            ? `${resource.name}`
            : t("resourceAddNewDesc", { networkName: network?.name })
        }
        color={"yellow"}
      />

      <Tabs defaultValue={tab} onValueChange={(v) => setTab(v)} value={tab}>
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"resource"}>
            <WorkflowIcon size={16} />
            {t("resourceTab")}
          </TabsTrigger>
          <TabsTrigger
            value={"access-control"}
            disabled={!resource && !canCreate}
          >
            <ShieldCheck size={16} />
            {t("accessControl")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={"resource"} className={"pb-4"}>
          <div className={"px-8 flex-col flex gap-6"}>
            <div>
              <Label>{t("resourceNameLabel")}</Label>
              <HelpText>{t("resourceNameHelp")}</HelpText>
              <Input
                ref={nameRef}
                autoFocus={true}
                tabIndex={0}
data-testid="resource-name-input"
				placeholder={t("resourceNamePlaceholder")}
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
                    {t("optionalSettings")}
                  </span>
                </AccordionTrigger>
                <AccordionContent className={""}>
                  <div className={"flex flex-col gap-6 pb-4 pt-2"}>
                    <div>
                      <Label>{t("resourceDescriptionLabel")}</Label>
                      <HelpText>{t("resourceDescriptionHelp")}</HelpText>
                      <Input
                        placeholder={t("resourceDescriptionPlaceholder")}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        data-testid="resource-description-input"
                      />
                    </div>
                    <div>
                      <Label>{t("resourceGroupsLabel")}</Label>
                      <HelpText className={"mt-1"}>
                        {t("resourceGroupsHelp")}
                      </HelpText>
                      <PeerGroupSelector
                        side={"top"}
                        onChange={setGroups}
                        values={groups}
                        showPeerCounter={false}
                        placeholder={t("resourceGroupsPlaceholder")}
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
                          {groupPolicyCount === 1
                            ? "this policy"
                            : "these policies"}
                          .
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
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </TabsContent>

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
      </Tabs>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            {t.rich("resourceGroupsLearnMore", {
              link: (chunks) => (
                <InlineLink
                  href={"https://docs.netbird.io/how-to/networks#resources"}
                  target={"_blank"}
                >
                  {chunks}
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              ),
            })}
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          {!resource ? (
            <>
              {tab === "resource" && (
                <>
                  <ModalClose asChild={true}>
                    <Button variant={"secondary"}>{tCommon("cancel")}</Button>
                  </ModalClose>
                  <Button
                    variant={"primary"}
                    data-testid="resource-continue"
                    onClick={() => setTab("access-control")}
                    disabled={!canCreate}
                  >
                    {tCommon("next")}
                  </Button>
                </>
              )}

              {tab === "access-control" && (
                <>
                  <Button
                    variant={"secondary"}
                    onClick={() => setTab("resource")}
                  >
                    {tCommon("back")}
                  </Button>
                  <Button
                    variant={"primary"}
                    data-testid={"submit-resource"}
                    onClick={createResource}
                    disabled={!canCreate}
                  >
                    <PlusCircle size={16} />
                    {t("addResource")}
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>{tCommon("cancel")}</Button>
              </ModalClose>
              <Button
                variant={"primary"}
                data-testid={"submit-route"}
                onClick={updateResource}
                disabled={!canCreate}
              >
                {t("saveChanges")}
              </Button>
            </>
          )}
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
