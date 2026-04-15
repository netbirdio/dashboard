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
import { useApiCall } from "@utils/api";
import { useDialog } from "@/contexts/DialogProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { useI18n } from "@/i18n/I18nProvider";
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
  const { t } = useI18n();
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
      return t("networkResources.nameExistsError");
    return "";
  }, [name, resourceExists, resource?.id, t]);

  const confirmMissingPolicies = async () => {
    if (allResourcePolicies.length > 0) return true;
    return confirm({
      title: t("networkResources.noPoliciesTitle"),
      description: t("networkResources.noPoliciesDescription"),
      type: "warning",
      confirmText: resource ? t("actions.saveChanges") : t("networkResources.add"),
      cancelText: t("actions.cancel"),
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
      await createPoliciesForResource(policies, r, savedGroups);
      onCreated?.(r);
    });

    notify({
      title: t("networkResources.createdTitle"),
      description: t("networkResources.createdDescription", { name }),
      loadingMessage: t("networkResources.creating"),
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
      await createPoliciesForResource(policies, r, savedGroups);
      onUpdated?.(r);
    });
    notify({
      title: t("networkResources.updatedTitle"),
      description: t("networkResources.updatedDescription", { name }),
      loadingMessage: t("networkResources.updating"),
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
        title={
          resource
            ? t("networkResources.editModalTitle")
            : t("networkResources.addModalTitle")
        }
        description={
          resource
            ? `${resource.name}`
            : t("networkResources.addModalDescription", { network: network?.name })
        }
        color={"yellow"}
      />

      <Tabs defaultValue={tab} onValueChange={(v) => setTab(v)} value={tab}>
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"resource"}>
            <WorkflowIcon size={16} />
            {t("networkResources.resourceTab")}
          </TabsTrigger>
          <TabsTrigger
            value={"access-control"}
            disabled={!resource && !canCreate}
          >
            <ShieldCheck size={16} />
            {t("networkResources.accessControlTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={"resource"} className={"pb-4"}>
          <div className={"px-8 flex-col flex gap-6"}>
            <div>
              <Label>{t("table.name")}</Label>
              <HelpText>{t("networkResources.nameHelp")}</HelpText>
              <Input
                ref={nameRef}
                autoFocus={true}
                tabIndex={0}
                placeholder={t("networkResources.namePlaceholder")}
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
                  {t("networkResources.addressDescriptionPrefix")}{" "}
                  <HelpTooltip
                    content={t("networkResources.addressIpHelp")}
                  >
                    {t("networkResources.ipAddress")}
                  </HelpTooltip>
                  ,{" "}
                  <HelpTooltip
                    content={t("networkResources.addressCidrHelp")}
                  >
                    {t("networkResources.cidrBlock")}
                  </HelpTooltip>{" "}
                  {t("networkResources.or")}{" "}
                  <HelpTooltip
                    content={t("networkResources.addressDomainHelp")}
                  >
                    {t("networkResources.domainName")}
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
                >
                  <span className={"relative top-[1px]"}>
                    {t("networkResources.optionalSettings")}
                  </span>
                </AccordionTrigger>
                <AccordionContent className={""}>
                  <div className={"flex flex-col gap-6 pb-4 pt-2"}>
                    <div>
                      <Label>{t("network.descriptionLabel")}</Label>
                      <HelpText>{t("networkResources.descriptionHelp")}</HelpText>
                      <Input
                        placeholder={t("networkResources.descriptionPlaceholder")}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>{t("networkResources.groupsLabel")}</Label>
                      <HelpText className={"mt-1"}>
                        {t("networkResources.groupsHelpLine1")} <br />
                        {t("networkResources.groupsHelpLine2")}
                      </HelpText>
                      <PeerGroupSelector
                        side={"top"}
                        onChange={setGroups}
                        values={groups}
                        showPeerCounter={false}
                        placeholder={t("networkResources.groupsPlaceholder")}
                        policies={allPolicies}
                      />
                      {groupPolicyCount > 0 && (
                        <Callout variant={"info"} className={"mt-3"}>
                          {t("networkResources.groupPolicyPrefix")}{" "}
                          <span className="text-white font-medium">
                            {t("networkResources.groupPolicyCount", {
                              count: groupPolicyCount,
                            })}
                          </span>
                          . {t("networkResources.groupPolicyInheritance")}{" "}
                          {groupPolicyCount === 1
                            ? t("networkResources.thisPolicy")
                            : t("networkResources.thesePolicies")}
                          .
                          {isAddressValid || resource ? (
                            <>
                              {" "}
                              {t("networkResources.reviewPoliciesPrefix")}{" "}
                              <InlineButtonLink
                                onClick={() => setTab("access-control")}
                                variant={"dashed"}
                              >
                                {t("networkResources.accessControlTab")}
                              </InlineButtonLink>{" "}
                              {t("networkResources.reviewPoliciesSuffix")}
                            </>
                          ) : (
                            ` ${t("networkResources.reviewPoliciesInline")}`
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
            {t("common.learnMorePrefix")}
            <InlineLink
              href={"https://docs.netbird.io/how-to/networks#resources"}
              target={"_blank"}
            >
              {t("networkResources.linkLabel")}
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
                    <Button variant={"secondary"}>{t("actions.cancel")}</Button>
                  </ModalClose>
                  <Button
                    variant={"primary"}
                    onClick={() => setTab("access-control")}
                    disabled={!canCreate}
                  >
                    {t("actions.continue")}
                  </Button>
                </>
              )}

              {tab === "access-control" && (
                <>
                  <Button
                    variant={"secondary"}
                    onClick={() => setTab("resource")}
                  >
                    {t("actions.back")}
                  </Button>
                  <Button
                    variant={"primary"}
                    data-cy={"submit-route"}
                    onClick={createResource}
                    disabled={!canCreate}
                  >
                    <PlusCircle size={16} />
                    {t("networkResources.add")}
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>{t("actions.cancel")}</Button>
              </ModalClose>
              <Button
                variant={"primary"}
                data-cy={"submit-route"}
                onClick={updateResource}
                disabled={!canCreate}
              >
                {t("actions.saveChanges")}
              </Button>
            </>
          )}
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
