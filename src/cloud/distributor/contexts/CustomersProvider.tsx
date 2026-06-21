import { notify } from "@components/Notification";
import useFetchApi, { useApiCall } from "@utils/api";
import * as React from "react";
import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { DistributorAccountExistsModal } from "@/cloud/distributor/DistributorAccountExistsModal";
import { DistributorCustomerModal } from "@/cloud/distributor/DistributorCustomerModal";
import { DistributorSubscriptionModal } from "@/cloud/distributor/DistributorSubscriptionModal";
import {
  DistributorCustomer,
  DistributorCustomerStatus,
} from "@/cloud/distributor/interfaces/Distributor";
import { useDialog } from "@/contexts/DialogProvider";

type Props = {
  children: React.ReactNode;
};

const CustomersContext = React.createContext(
  {} as {
    customers?: DistributorCustomer[];
    openCreateCustomerModal: () => void;
    openEditCustomerModal: (customer: DistributorCustomer, initialTab?: string) => void;
    openAccountExistsModal: (customer: DistributorCustomer) => void;
    unlinkCustomer: (customer: DistributorCustomer) => Promise<void>;
  },
);

export const CustomersProvider = ({ children }: Props) => {
  const { data: customers } = useFetchApi<DistributorCustomer[]>(
    "/integrations/msp/reseller/msps",
  );
  const { mutate } = useSWRConfig();
  const [customerModal, setCustomerModal] = useState(false);
  const [subscriptionModal, setSubscriptionModal] = useState(false);
  const [accountExistsModal, setAccountExistsModal] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<DistributorCustomer>();
  const [initialTab, setInitialTab] = useState<string>();
  const { confirm } = useDialog();

  const customerRequest = useApiCall<string>(
    `/integrations/msp/reseller/msps`,
    true,
  );

  const unlinkCustomer = async (customer: DistributorCustomer) => {
    const choice = await confirm({
      title: `Unlink '${customer.name}'?`,
      description:
        "Unlinking this customer will remove it from your distributor account. The account will continue to exist independently.",
      confirmText: "Unlink",
      cancelText: "Cancel",
      type: "danger",
      maxWidthClass: "max-w-[480px]",
    });
    if (!choice) return;

    const promise = customerRequest.del({}, `/${customer.id}`).then(() => {
      mutate("/integrations/msp/reseller/msps");
    });

    notify({
      title: `Unlinking ${customer.name}`,
      description: `Successfully unlinked ${customer.name} (${customer.domain})`,
      loadingMessage: `Unlinking ${customer.name}...`,
      promise,
    });

    return promise;
  };

  const sendAccountRequest = async (customer?: DistributorCustomer) => {
    const c = customer || currentCustomer;
    if (!c) return;

    const request = customerRequest
      .post({}, `/${c.id}/invite`)
      .then(() => {
        mutate("/integrations/msp/reseller/msps");
        mutate("/integrations/msp/reseller");
      })
      .finally(() => {
        setCustomerModal(false);
        setAccountExistsModal(false);
        setCurrentCustomer(undefined);
      });

    notify({
      title: `Request Account Access`,
      description: "Request has been sent successfully.",
      loadingMessage: "Sending request...",
      promise: request,
    });

    return request;
  };

  const cancelAccountRequest = (customer?: DistributorCustomer) => {
    const c = customer || currentCustomer;
    if (!c) return;
    return customerRequest
      .del({}, `/${c.id}`)
      .then(() => {
        mutate("/integrations/msp/reseller/msps");
        mutate("/integrations/msp/reseller");
      })
      .finally(() => {
        setCustomerModal(false);
        setAccountExistsModal(false);
        setCurrentCustomer(undefined);
      });
  };

  const onCustomerCreated = (customer: DistributorCustomer) => {
    if (customer.status === DistributorCustomerStatus.Existing) {
      setCurrentCustomer(customer);
      setAccountExistsModal(true);
      return;
    }
    if (customer.status === DistributorCustomerStatus.Invited) {
      return;
    }
    setCurrentCustomer(customer);
    setSubscriptionModal(true);
  };

  const contextData = useMemo(() => {
    const openCreateCustomerModal = () => {
      setCurrentCustomer(undefined);
      setInitialTab(undefined);
      setCustomerModal(true);
    };

    const openEditCustomerModal = (
      customer: DistributorCustomer,
      initialTab?: string,
    ) => {
      setCurrentCustomer(customer);
      setInitialTab(initialTab);
      setCustomerModal(true);
    };

    const openAccountExistsModal = (customer: DistributorCustomer) => {
      setCurrentCustomer(customer);
      setAccountExistsModal(true);
    };

    return {
      customers,
      openCreateCustomerModal,
      openEditCustomerModal,
      openAccountExistsModal,
    };
  }, [customers]);

  return (
    <CustomersContext.Provider
      value={{
        ...contextData,
        unlinkCustomer,
      }}
    >
      <DistributorCustomerModal
        open={customerModal}
        setOpen={(state) => {
          if (!state) {
            setCurrentCustomer(undefined);
            setInitialTab(undefined);
          }
          setCustomerModal(state);
        }}
        customer={currentCustomer}
        initialTab={initialTab}
        onCreated={onCustomerCreated}
      />

      {subscriptionModal && currentCustomer && (
        <DistributorSubscriptionModal
          open={subscriptionModal}
          setOpen={(o) => {
            if (!o) {
              setCurrentCustomer(undefined);
              setInitialTab(undefined);
            }
            setSubscriptionModal(o);
          }}
          name={currentCustomer.name}
          accountId={currentCustomer.id}
        />
      )}

      {accountExistsModal && currentCustomer && (
        <DistributorAccountExistsModal
          customer={currentCustomer}
          open={accountExistsModal}
          setOpen={setAccountExistsModal}
          onAccept={sendAccountRequest}
          onCancel={cancelAccountRequest}
        />
      )}

      {children}
    </CustomersContext.Provider>
  );
};

export const useCustomers = () => {
  const context = React.useContext(CustomersContext);
  if (context === undefined) {
    throw new Error("useCustomers must be used within a CustomersProvider");
  }
  return context;
};
