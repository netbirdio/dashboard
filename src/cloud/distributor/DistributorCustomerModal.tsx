import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import Separator from "@components/Separator";
import { useApiCall } from "@utils/api";
import { cn, validator } from "@utils/helpers";
import {
  CreditCardIcon,
  ExternalLinkIcon,
  GlobeIcon,
  PlusCircle,
  Text,
  UserIcon,
} from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { DistributorDocsLink } from "@/cloud/distributor/DistributorDocsLink";
import { useCustomerPlan } from "@/cloud/distributor/hooks/useCustomerPlan";
import {
  DistributorCustomer,
  DistributorCustomerStatus,
} from "@/cloud/distributor/interfaces/Distributor";
import { PlanCard, PlanLoadingSkeleton } from "@/modules/billing/PlanCard";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  customer?: DistributorCustomer;
  initialTab?: string;
  onCreated?: (customer: DistributorCustomer) => void;
};

export const DistributorCustomerModal = ({
  open,
  setOpen,
  customer,
  initialTab,
  onCreated,
}: Props) => {
  return (
    <Modal open={open} onOpenChange={setOpen} key={open ? 1 : 0}>
      <CustomerModalContent
        setOpen={setOpen}
        customer={customer}
        initialTab={initialTab}
        onCreated={onCreated}
      />
    </Modal>
  );
};

const ModalWidth = {
  general: "max-w-xl",
  plan: "max-w-3xl",
} as Record<string, string>;

const CustomerModalContent = ({
  setOpen,
  customer,
  initialTab,
  onCreated,
}: Omit<Props, "open">) => {
  const { mutate } = useSWRConfig();
  const customerRequest = useApiCall<DistributorCustomer>(
    "/integrations/msp/reseller/msps",
    true,
  );

  const [tab, setTab] = useState(initialTab || "general");
  const [name, setName] = useState(customer?.name || "");
  const [resellerCustomerId, setResellerCustomerId] = useState(
    customer?.reseller_customer_id || "",
  );
  const [domain, setDomain] = useState(customer?.domain || "");

  const domainInputError = useMemo(() => {
    if (domain === "") return "";
    if (!validator.isValidDomain(domain)) {
      return "Please enter a valid domain, e.g. netbird.io";
    }
    return "";
  }, [domain]);

  const createCustomer = async () => {
    const body: Record<string, string> = {
      name,
      domain,
    };
    if (resellerCustomerId) body.reseller_customer_id = resellerCustomerId;
    const promise = customerRequest.post(body).then((res) => {
      const c = res as DistributorCustomer;
      mutate("/integrations/msp/reseller/msps");
      setOpen(false);
      onCreated?.(c);
    });

    notify({
      title: `Add ${domain} customer`,
      description: "The customer account has been created successfully.",
      preventSuccessToast: true,
      loadingMessage: "Creating customer account...",
      promise,
    });
  };

  const saveCustomer = async () => {
    if (!customer) return;
    const body: Record<string, string> = { name };
    body.reseller_customer_id = resellerCustomerId;
    const promise = customerRequest.put(body, `/${customer.id}`).then(() => {
      mutate("/integrations/msp/reseller/msps");
      setOpen(false);
    });

    notify({
      title: `Update ${customer.name}`,
      description: "The customer has been updated successfully.",
      loadingMessage: "Updating customer...",
      promise,
    });
  };

  const canCreate =
    domainInputError === "" &&
    name !== "" &&
    domain !== "";

  const hasChanges =
    name !== (customer?.name || "") ||
    resellerCustomerId !== (customer?.reseller_customer_id || "");

  const isActive = customer?.status === DistributorCustomerStatus.Active;

  return (
    <ModalContent maxWidthClass={cn(ModalWidth[tab] || ModalWidth.general)}>
      <ModalHeader
        icon={<UserIcon size={18} />}
        title={customer ? "Edit Customer" : "Add Customer"}
        description={
          customer
            ? `${customer.name} (${customer.domain})`
            : "Add a new customer account to your distributor organization."
        }
        color={"netbird"}
      />
      {customer ? (
        <Tabs defaultValue={"general"} value={tab} onValueChange={setTab}>
          <TabsList justify={"start"} className={"px-8"}>
            <TabsTrigger value={"general"}>
              <Text
                size={16}
                className={
                  "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
                }
              />
              General
            </TabsTrigger>
            {isActive && (
              <TabsTrigger value={"plan"}>
                <CreditCardIcon
                  size={16}
                  className={
                    "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
                  }
                />
                Plan
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value={"general"} className={"px-8 pb-10"}>
            <div className={"flex flex-col gap-6"}>
              <div>
                <Label>Company</Label>
                <HelpText>
                  Enter the name of your customers company.
                </HelpText>
                <Input
                  autoFocus={true}
                  tabIndex={0}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={"Acme Inc."}
                  className={"min-w-[270px]"}
                />
              </div>
              <div>
                <Label>Domain</Label>
                <HelpText>
                  The domain associated with this customer account.
                </HelpText>
                <Input
                  customPrefix={<GlobeIcon size={16} />}
                  tabIndex={0}
                  value={domain}
                  error={domainInputError}
                  disabled={true}
                  placeholder={"acme-inc.com"}
                  className={"w-full"}
                />
              </div>

              <div>
                <Label>Customer ID (optional)</Label>
                <HelpText>
                  An optional identifier to easier map customers to your{" "}
                  <b className="text-white">internal systems</b>.
                </HelpText>
                <Input
                  tabIndex={0}
                  value={resellerCustomerId}
                  onChange={(e) => setResellerCustomerId(e.target.value)}
                  placeholder={"84726193"}
                  className={"min-w-[270px]"}
                />
              </div>
            </div>
          </TabsContent>
          {isActive && (
            <TabsContent value={"plan"} className={"px-8 pb-6"}>
              <CustomerPlanTab customer={customer} />
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <>
          <Separator />
          <div className={"px-8 py-6 pb-8"}>
            <div className={"flex flex-col gap-6"}>
              <div>
                <Label>Company</Label>
                <HelpText>
                  Enter the name of your customers company.
                </HelpText>
                <Input
                  autoFocus={true}
                  tabIndex={0}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={"Acme Inc."}
                  className={"min-w-[270px]"}
                />
              </div>
              <div>
                <Label>Domain</Label>
                <HelpText>
                  The domain associated with this customer account.
                </HelpText>
                <Input
                  customPrefix={<GlobeIcon size={16} />}
                  tabIndex={0}
                  value={domain}
                  error={domainInputError}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder={"acme-inc.com"}
                  className={"w-full"}
                />
              </div>
              <div>
                <Label>Customer ID (optional)</Label>
                <HelpText>
                  An optional identifier to easier map customers to your{" "}
                  <b className="text-white">internal systems</b>.
                </HelpText>
                <Input
                  tabIndex={0}
                  value={resellerCustomerId}
                  onChange={(e) => setResellerCustomerId(e.target.value)}
                  placeholder={"84726193"}
                  className={"min-w-[270px]"}
                />
              </div>
            </div>
          </div>
        </>
      )}
      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            {tab === "plan" ? (
              <>
                Learn more about
                <InlineLink
                  href={"https://netbird.io/pricing"}
                  target={"_blank"}
                >
                  Pricing & Plans
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </>
            ) : (
              <DistributorDocsLink />
            )}
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          {!customer && (
            <>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>Cancel</Button>
              </ModalClose>
              <Button
                variant={"primary"}
                onClick={createCustomer}
                disabled={!canCreate}
              >
                <PlusCircle size={16} />
                Add Customer
              </Button>
            </>
          )}
          {customer && (
            <>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>Cancel</Button>
              </ModalClose>
              <Button
                variant={"primary"}
                onClick={saveCustomer}
                disabled={!hasChanges || name === ""}
              >
                Save
              </Button>
            </>
          )}
        </div>
      </ModalFooter>
    </ModalContent>
  );
};

const CustomerPlanTab = ({ customer }: { customer: DistributorCustomer }) => {
  const {
    plans,
    isLoading,
    currentPlan,
    currency,
    isSubscribing,
    subscribe,
    subscription,
  } = useCustomerPlan({ accountId: customer.id });

  return (
    <div className={"grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 gap-4"}>
      {(!plans || isLoading) && (
        <>
          <PlanLoadingSkeleton height={378} />
          <PlanLoadingSkeleton height={378} />
        </>
      )}
      {!isLoading &&
        plans?.map((plan) => (
          <PlanCard
            currentPlan={currentPlan}
            currentSubscription={subscription}
            plan={plan}
            currency={currency}
            isSubscribing={isSubscribing}
            onClick={() => subscribe(plan)}
            key={plan.name}
          />
        ))}
    </div>
  );
};
