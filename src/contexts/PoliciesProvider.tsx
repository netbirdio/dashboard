import { Modal } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import React, { useState } from "react";
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
    openEditPolicyModal: (policy: Policy, tab?: string) => void;
  },
);

export default function PoliciesProvider({ children }: Props) {
  const request = useApiCall<Policy>("/policies");
  const [policyModal, setPolicyModal] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState<Policy>();
  const [initialPolicyTab, setInitialPolicyTab] = useState("");

  const createPolicy = async (policy: Policy) => request.post(policy);

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

  const openEditPolicyModal = (policy: Policy, tab?: string) => {
    setCurrentPolicy(policy);
    tab && setInitialPolicyTab(tab);
    setPolicyModal(true);
  };

  return (
    <PoliciesContext.Provider
      value={{ updatePolicy, createPolicy, openEditPolicyModal }}
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

