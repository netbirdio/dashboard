import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import React from "react";
import { Policy } from "@/interfaces/Policy";

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
  },
);

export default function PoliciesProvider({ children }: Props) {
  const request = useApiCall<Policy>("/policies");

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

  return (
    <PoliciesContext.Provider value={{ updatePolicy, createPolicy }}>
      {children}
    </PoliciesContext.Provider>
  );
}

export const usePolicies = () => {
  return React.useContext(PoliciesContext);
};
