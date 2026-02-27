import { Modal } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { cloneDeep } from "@utils/helpers";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { useGroups } from "@/contexts/GroupsProvider";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
import { AccessControlModalContent } from "@/modules/access-control/AccessControlModal";

type Props = {
  children: React.ReactNode;
};

const PoliciesContext = React.createContext(
  {} as {
    updatePolicy: (
      policy: Policy,
      toUpdate: Partial<Policy>,
      onSuccess?: (p: Policy) => void,
      message?: string,
    ) => void;
    createPolicy: (policy: Policy) => Promise<Policy>;
    createPolicyForResource: (
      policy: Policy,
      resource: NetworkResource,
    ) => Promise<Policy>;
    openEditPolicyModal: (policy: Policy, tab?: string) => void;
    deletePolicy: (policy: Policy, onSuccess?: () => void) => Promise<void>;
    serializeRules: (
      rules: Policy["rules"],
      enabled?: boolean,
    ) => Policy["rules"];
  },
);

export default function PoliciesProvider({ children }: Props) {
  const { mutate } = useSWRConfig();
  const request = useApiCall<Policy>("/policies");
  const { createOrUpdate: createOrUpdateGroup } = useGroups();
  const [policyModal, setPolicyModal] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState<Policy>();
  const [initialPolicyTab, setInitialPolicyTab] = useState("");

  const createPolicy = async (policy: Policy) => request.post(policy);

  const createPolicyForResource = async (
    policy: Policy,
    resource: NetworkResource,
  ) => {
    const rule = policy.rules[0];

    const sources = await Promise.all(
      (rule.sources ?? []).map((g) => {
        if (typeof g === "string") return g;
        if (g.id) return g.id;
        return createOrUpdateGroup(g).then((r) => r.id);
      }),
    ).then((ids) => ids.filter(Boolean) as string[]);

    const hasGroups = resource.groups && resource.groups.length > 0;

    const destinations = hasGroups
      ? await Promise.all(
          (resource.groups as (Group | string)[]).map((g) => {
            if (typeof g === "string") return g;
            if (g.id) return g.id;
            return createOrUpdateGroup(g).then((r) => r.id);
          }),
        ).then((ids) => ids.filter(Boolean) as string[])
      : null;

    return createPolicy({
      ...policy,
      source_posture_checks: (policy.source_posture_checks ?? []).map((c) =>
        typeof c === "string" ? c : c.id,
      ),
      rules: [
        {
          ...rule,
          sources,
          destinations,
          destinationResource: hasGroups
            ? undefined
            : { id: resource.id, type: resource.type },
        },
      ],
    } as Policy);
  };

  const serializeRules = (rules: Policy["rules"], enabled?: boolean) => {
    rules = cloneDeep(rules);
    rules.forEach((rule) => {
      if (enabled !== undefined) rule.enabled = enabled;
      rule.sources = rule.sources
        ? (rule.sources.map((s) => {
            const group = s as Group;
            return group.id ?? s;
          }) as string[])
        : [];
      rule.destinations = rule.destinations
        ? (rule.destinations.map((d) => {
            const group = d as Group;
            return group.id ?? d;
          }) as string[])
        : [];
      if (rule.destinationResource) rule.destinations = null;
      if (rule.sourceResource) rule.sources = null;
    });
    return rules;
  };

  const updatePolicy = async (
    policy: Policy,
    toUpdate: Partial<Policy>,
    onSuccess?: (p: Policy) => void,
    message?: string,
  ) => {
    notify({
      title: "Access Control Policy " + policy.name,
      description:
        message || "The access control policy was successfully updated",
      promise: request
        .put(
          {
            name: toUpdate.name ?? policy.name ?? "",
            description: toUpdate.description ?? policy.description ?? "",
            enabled: toUpdate.enabled ?? policy.enabled,
            query: toUpdate.query ?? policy.query ?? "",
            rules: toUpdate.rules ?? policy.rules ?? [],
            source_posture_checks:
              toUpdate.source_posture_checks ??
              policy.source_posture_checks ??
              [],
          },
          `/${policy.id}`,
        )
        .then((p) => {
          onSuccess && onSuccess(p);
        }),
      loadingMessage: "Updating policy...",
    });
  };

  const deletePolicy = async (policy: Policy, onSuccess?: () => void) => {
    const promise = request.del("", `/${policy.id}`).then(() => {
      mutate("/policies");
      onSuccess?.();
    });
    notify({
      title: "Access Control Policy " + policy.name,
      description: "The policy was successfully deleted.",
      promise,
      loadingMessage: "Deleting policy...",
    });
    return promise;
  };

  const openEditPolicyModal = (policy: Policy, tab?: string) => {
    setCurrentPolicy(policy);
    tab && setInitialPolicyTab(tab);
    setPolicyModal(true);
  };

  return (
    <PoliciesContext.Provider
      value={{
        updatePolicy,
        createPolicy,
        createPolicyForResource,
        openEditPolicyModal,
        deletePolicy,
        serializeRules,
      }}
    >
      {children}
      <Modal
        open={policyModal}
        onOpenChange={(state) => {
          setPolicyModal(state);
          setCurrentPolicy(undefined);
        }}
      >
        <AccessControlModalContent
          key={policyModal ? "1" : "0"}
          policy={currentPolicy}
          initialTab={initialPolicyTab}
          onSuccess={async (p) => {
            setPolicyModal(false);
            setCurrentPolicy(undefined);
          }}
        />
      </Modal>
    </PoliciesContext.Provider>
  );
}

export const usePolicies = () => {
  return React.useContext(PoliciesContext);
};
