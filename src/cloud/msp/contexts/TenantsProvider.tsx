import { notify } from "@components/Notification";
import useFetchApi, { useApiCall } from "@utils/api";
import * as React from "react";
import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import {
  Tenant,
  TenantDNSResponse,
  TenantStatus,
} from "@/cloud/msp/interfaces/Tenant";
import { MSPAccountExistsModal } from "@/cloud/msp/MSPAccountExistsModal";
import { MSPDomainVerificationModal } from "@/cloud/msp/MSPDomainVerificationModal";
import { MSPSubscriptionModal } from "@/cloud/msp/MSPSubscriptionModal";
import { MSPTenantModal } from "@/cloud/msp/MSPTenantModal";
import { MSPUnlinkModal } from "@/cloud/msp/MSPUnlinkModal";
import { useDialog } from "@/contexts/DialogProvider";
import { Currency, Plan } from "@/interfaces/Plan";
import { User } from "@/interfaces/User";

type Props = {
  children: React.ReactNode;
};

const TenantsContext = React.createContext(
  {} as {
    tenants?: Tenant[];
    openCreateTenantModal: () => void;
    openEditTenantModal: (tenant: Tenant, initialTab?: string) => void;
    openDomainVerificationModal: (tenant: Tenant, dnsChallenge: string) => void;
    setCurrentTenant: React.Dispatch<React.SetStateAction<Tenant | undefined>>;
    verifyDomain: (tenant?: Tenant, openModal?: boolean) => Promise<void>;
    openUnlinkTenantModal: (tenant: Tenant) => void;
    openAccountExistsModal: (tenant: Tenant) => void;
    unlinkTenant: (tenant: Tenant, owner: User) => Promise<void>;
    deleteTenant: (tenant: Tenant) => Promise<void>;
    updateSubscription: (
      tenant: Tenant,
      plan: Plan,
      currency: Currency,
      isOnFreeOrTrial: boolean,
    ) => Promise<string>;
  },
);

export const TenantsProvider = ({ children }: Props) => {
  const { data: tenants } = useFetchApi<Tenant[]>("/integrations/msp/tenants");
  const { mutate } = useSWRConfig();
  const [accountModal, setAccountModal] = useState(false);
  const [initialTab, setInitialTab] = useState<string>();
  const [currentTenant, setCurrentTenant] = useState<Tenant>();
  const [currentDNSChallenge, setCurrentDNSChallenge] = useState("");
  const [domainVerificationModal, setDomainVerificationModal] = useState(false);
  const [subscriptionModal, setSubscriptionModal] = useState(false);
  const [unlinkModal, setUnlinkModal] = useState(false);
  const [accountExistsModal, setAccountExistsModal] = useState(false);
  const { confirm } = useDialog();

  const tenantRequest = useApiCall<TenantDNSResponse>(
    `/integrations/msp/tenants`,
    true,
  );

  const mspTenantRequest = useApiCall<string>(
    `/integrations/msp/tenants`,
    true,
  );

  const deleteTenant = async (tenant: Tenant) => {
    const choice = await confirm({
      title: `Delete '${tenant.name}'?`,
      description:
        "Deleting this tenant will permanently remove all of its associated data, including its peers, users, groups and everything else. Please be aware that this action is irreversible and cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
      maxWidthClass: "max-w-[480px]",
    });
    if (!choice) return;

    const promise = mspTenantRequest.del({}, `/${tenant.id}`).then(() => {
      mutate("/integrations/msp/tenants");
    });

    notify({
      title: `Deleting ${tenant.name}`,
      description: `Successfully deleted ${tenant.name} (${tenant.domain})`,
      loadingMessage: `Deleting ${tenant.name}...`,
      promise,
    });

    return promise;
  };

  const unlinkTenant = async (tenant: Tenant, owner: User) => {
    const promise = mspTenantRequest
      .post(
        {
          owner: owner.id,
        },
        `/${tenant.id}/unlink`,
      )
      .then(() => {
        setCurrentTenant(undefined);
        setUnlinkModal(false);
        mutate("/integrations/msp/tenants");
      });

    notify({
      title: `Unlinking ${tenant.name}`,
      description: `Successfully unlinked ${tenant.name} (${tenant.domain})`,
      loadingMessage: `Unlinking ${tenant.name}...`,
      promise,
    });
    return promise;
  };

  const updateSubscription = async (
    tenant: Tenant,
    plan: Plan,
    currency: Currency,
    isOnFreeOrTrial: boolean,
  ) => {
    let price = plan.prices.find((price) => price.currency === currency);

    // Initial MSP subscription for Free or Trial plans, otherwise update the subscription with regular billing endpoint
    const promise = isOnFreeOrTrial
      ? mspTenantRequest.post(
          {
            priceID: price?.price_id,
          },
          `/${tenant.id}/subscription`,
        )
      : mspTenantRequest.put(
          {
            priceID: price?.price_id,
          },
          `/${tenant.id}/subscription`,
        );

    notify({
      title: `Subscription for ${tenant.name}`,
      description: `Successfully subscribed to the ${plan.name} plan.`,
      loadingMessage: `Subscribing to ${plan.name}...`,
      promise,
    });
    return promise;
  };

  const verifyDomain = async (tenant?: Tenant, openModal?: boolean) => {
    let t = tenant || currentTenant;
    if (!t) return;
    const domain = t.domain;

    const dnsPromise = tenantRequest
      .post({}, `/${t.id}/dns`)
      .then(() => {
        setCurrentTenant(t);
        setSubscriptionModal(true);
      })
      .catch((res) => {
        setCurrentTenant(t);
        setCurrentDNSChallenge(res.dns_challenge as string);
        openModal && setDomainVerificationModal(true);
        throw { code: 501 };
      });

    notify({
      title: `Verification of ${domain}`,
      description: "The domain ownership has been verified successfully.",
      loadingTitle: `Verifying ownership of ${domain}`,
      loadingMessage: "Please wait while we verify the domain ownership...",
      promise: dnsPromise,
      errorMessages: [
        {
          code: 501,
          message: "DNS record not found. Please try again...",
        },
      ],
    });

    // Return the promise directly
    return dnsPromise;
  };

  const sendAccountRequest = async (tenant?: Tenant) => {
    let t = tenant || currentTenant;
    if (!t) return;

    const request = tenantRequest
      .post({}, `/${t.id}/invite`)
      .then(() => {
        mutate("/integrations/msp/tenants");
        mutate("/integrations/msp");
        mutate("/integrations/msp/switcher");
      })
      .finally(() => {
        setAccountModal(false);
        setAccountExistsModal(false);
        setCurrentTenant(undefined);
      });

    notify({
      title: `Request Account Access`,
      description: "Request has been sent successfully.",
      loadingMessage: "Sending request...",
      promise: request,
    });

    return request;
  };

  const cancelAccountRequest = (tenant?: Tenant) => {
    let t = tenant || currentTenant;
    if (!t) return;
    return tenantRequest
      .del({}, `/${t.id}`)
      .then(() => {
        mutate("/integrations/msp/tenants");
        mutate("/integrations/msp");
        mutate("/integrations/msp/switcher");
      })
      .finally(() => {
        setAccountModal(false);
        setAccountExistsModal(false);
        setCurrentTenant(undefined);
      });
  };

  const contextData = useMemo(() => {
    const openCreateTenantModal = () => {
      setCurrentTenant(undefined);
      setAccountModal(true);
    };

    const openEditTenantModal = (tenant: Tenant, initialTab?: string) => {
      if (tenant.status === TenantStatus.Invited) return;
      if (tenant.status === TenantStatus.Existing) return;
      setCurrentTenant(tenant);
      setInitialTab(initialTab);
      setAccountModal(true);
    };

    const openAccountExistsModal = (tenant: Tenant) => {
      setCurrentTenant(tenant);
      setAccountExistsModal(true);
    };

    const openUnlinkTenantModal = (tenant: Tenant) => {
      setCurrentTenant(tenant);
      setUnlinkModal(true);
    };

    const openDomainVerificationModal = (
      tenant: Tenant,
      dnsChallenge: string,
    ) => {
      setCurrentTenant(tenant);
      setCurrentDNSChallenge(dnsChallenge);
      setDomainVerificationModal(true);
    };

    return {
      tenants,
      openCreateTenantModal,
      openEditTenantModal,
      setCurrentTenant,
      openDomainVerificationModal,
      openUnlinkTenantModal,
      openAccountExistsModal,
    };
  }, [tenants]);

  return (
    <TenantsContext.Provider
      value={{
        ...contextData,
        verifyDomain,
        updateSubscription,
        unlinkTenant,
        deleteTenant,
      }}
    >
      <MSPTenantModal
        open={accountModal}
        setOpen={(state) => {
          if (!state) {
            setCurrentTenant(undefined);
            setCurrentDNSChallenge("");
            setInitialTab(undefined);
          }
          setAccountModal(state);
        }}
        tenant={currentTenant}
        initialTab={initialTab}
      />
      {domainVerificationModal && currentDNSChallenge && currentTenant && (
        <MSPDomainVerificationModal
          open={domainVerificationModal}
          setOpen={setDomainVerificationModal}
          tenant={currentTenant}
          token={currentDNSChallenge}
          onSuccess={() => {
            mutate("/integrations/msp/tenants");
            setDomainVerificationModal(false);
            setCurrentDNSChallenge("");
            setInitialTab(undefined);
            setSubscriptionModal(true);
          }}
          onCancel={() => {
            mutate("/integrations/msp/tenants");
            setDomainVerificationModal(false);
            setCurrentDNSChallenge("");

            setAccountModal(false);
            setInitialTab(undefined);
            setCurrentTenant(undefined);
          }}
        />
      )}

      {subscriptionModal && currentTenant && (
        <MSPSubscriptionModal
          open={subscriptionModal}
          setOpen={(o) => {
            if (!o) {
              setAccountModal(false);
              setCurrentTenant(undefined);
              setInitialTab(undefined);
            }
            setSubscriptionModal(o);
          }}
          tenant={currentTenant}
        />
      )}

      {unlinkModal && currentTenant && (
        <MSPUnlinkModal
          open={unlinkModal}
          setOpen={setUnlinkModal}
          tenant={currentTenant}
        />
      )}

      {accountExistsModal && currentTenant && (
        <MSPAccountExistsModal
          tenant={currentTenant}
          open={accountExistsModal}
          setOpen={setAccountExistsModal}
          onAccept={sendAccountRequest}
          onCancel={cancelAccountRequest}
        />
      )}

      {children}
    </TenantsContext.Provider>
  );
};

export const useTenants = () => {
  const context = React.useContext(TenantsContext);
  if (context === undefined) {
    throw new Error("useTenants must be used within a TenantsProvider");
  }
  return context;
};
