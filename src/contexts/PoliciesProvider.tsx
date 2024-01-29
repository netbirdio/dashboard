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
  },
);

export default function PoliciesProvider({ children }: Props) {
  const request = useApiCall<Policy>("/policies");

  const updatePolicy = async (
    policy: Policy,
    toUpdate: Partial<Policy>,
    onSuccess?: (p: Policy) => void,
    message?: string,
  ) => {
    notify({
      title: "Access Control Rule " + policy.name,
      description: message
        ? message
        : "The access control rule was successfully updated",
      promise: request
        .put(
          {
            name: toUpdate.name ?? policy.name ?? "",
            description: toUpdate.description ?? policy.description ?? "",
            enabled: toUpdate.enabled ?? policy.enabled,
            query: toUpdate.query ?? policy.query ?? "",
            rules: toUpdate.rules ?? policy.rules ?? [],
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
    <PoliciesContext.Provider value={{ updatePolicy }}>
      {children}
    </PoliciesContext.Provider>
  );
}

export const usePolicies = () => {
  return React.useContext(PoliciesContext);
};
