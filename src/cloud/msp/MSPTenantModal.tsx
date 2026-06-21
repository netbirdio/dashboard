import Button from "@components/Button";
import Card from "@components/Card";
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
import { useHasChanges } from "@hooks/useHasChanges";
import { useApiCall } from "@utils/api";
import { cn, validator } from "@utils/helpers";
import {
  ExternalLinkIcon,
  GlobeIcon,
  LockIcon,
  PlusCircle,
  ShieldCheckIcon,
  Text,
  UserIcon,
} from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useTenants } from "@/cloud/msp/contexts/TenantsProvider";
import {
  Tenant,
  TenantDNSResponse,
  TenantGroup,
  TenantStatus,
} from "@/cloud/msp/interfaces/Tenant";
import { MSPTenantDocsLink } from "@/cloud/msp/MSPTenantDocsLink";
import { MSPTenantPermissionsTab } from "@/cloud/msp/MSPTenantPermissionsTab";
import {
  MSPTenantPlanTab,
  MSPTenantPlanTabTrigger,
} from "@/cloud/msp/MSPTenantPlanTab";
import { Role } from "@/interfaces/User";
import useGroupHelper from "@/modules/groups/useGroupHelper";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  tenant?: Tenant;
  initialTab?: string;
};

export const MSPTenantModal = ({
  open,
  setOpen,
  tenant,
  initialTab,
}: Props) => {
  return (
    <Modal open={open} onOpenChange={setOpen} key={open ? 1 : 0}>
      <MspAccountModalContent
        open={open}
        setOpen={setOpen}
        tenant={tenant}
        initialTab={initialTab}
      />
    </Modal>
  );
};

const ModalWidth = {
  general: "max-w-xl",
  permissions: "max-w-[660px]",
  plan: "max-w-3xl",
} as Record<string, string>;

const MspAccountModalContent = ({ setOpen, tenant, initialTab }: Props) => {
  const { mutate } = useSWRConfig();
  const { openDomainVerificationModal, verifyDomain, openAccountExistsModal } =
    useTenants();
  const tenantRequest = useApiCall<TenantDNSResponse>(
    "/integrations/msp/tenants",
    true,
  );

  const [tab, setTab] = useState(initialTab || "general");

  const [name, setName] = useState(tenant?.name || "");
  const [domain, setDomain] = useState(tenant?.domain || "");

  const initialGroupIds = (tenant?.groups?.map((g) => g.id) as string[]) || [];
  const [groups, setGroups, { save: saveGroups }] = useGroupHelper({
    initial: initialGroupIds,
  });

  const [tenantGroups, setTenantGroups] = useState<TenantGroup[]>(
    tenant?.groups || [],
  );

  const domainInputError = useMemo(() => {
    if (domain === "") return "";
    if (!validator.isValidDomain(domain)) {
      return "Please enter a valid domain, e.g. netbird.io";
    }
    return "";
  }, [domain]);

  const createTenant = async () => {
    const savedGroups = await saveGroups();
    const newTenantGroups = savedGroups.map((group) => {
      return {
        id: group.id,
        role:
          tenantGroups?.find(
            (tg) => tg.name === group.name || tg?.id === group?.id,
          )?.role ?? Role.Admin,
      } as TenantGroup;
    });

    notify({
      title: `Add ${domain} account`,
      description: "The tenant account has been created successfully.",
      preventSuccessToast: true,
      promise: tenantRequest
        .post({ name, domain, groups: newTenantGroups })
        .then((res) => {
          const t = res as Tenant;
          if (t?.status === TenantStatus.Existing) {
            openAccountExistsModal(t);
          } else {
            mutate("/integrations/msp/tenants");
            mutate("/integrations/msp");
            mutate("/integrations/msp/switcher");
            openDomainVerificationModal(res as Tenant, res.dns_challenge);
          }
        }),
    });
  };

  const updateTenant = async () => {
    if (!tenant) return;
    const savedGroups = await saveGroups();
    const newTenantGroups = savedGroups.map((group) => {
      return {
        id: group.id,
        role:
          tenantGroups?.find(
            (tg) => tg.name === group.name || tg?.id === group?.id,
          )?.role ?? Role.Admin,
      } as TenantGroup;
    });

    notify({
      title: `Update ${tenant?.domain} account`,
      description: "The tenant account has been updated successfully.",
      promise: tenantRequest
        .put({ name, groups: newTenantGroups }, `/${tenant.id}`)
        .then(() => refreshAndClose()),
    });
  };

  const refreshAndClose = () => {
    mutate("/integrations/msp/tenants");
    mutate("/integrations/msp");
    mutate("/integrations/msp/switcher");
    setOpen(false);
  };

  const canContinue = domainInputError === "" && name !== "" && domain !== "";
  const { hasChanges } = useHasChanges([name, groups, tenantGroups]);
  const isActive = tenant?.activated_at !== undefined;

  return (
    <ModalContent maxWidthClass={cn(ModalWidth[tab])}>
      <ModalHeader
        icon={<UserIcon size={18} />}
        title={tenant ? `Update Tenant` : "Add Tenant"}
        description={
          tenant
            ? `${tenant.name} (${tenant.domain})`
            : "Add a new tenant account to your organization."
        }
        color={"netbird"}
      />
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
          <TabsTrigger value={"permissions"} disabled={!canContinue}>
            <LockIcon
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Permissions
          </TabsTrigger>
          {tenant && <MSPTenantPlanTabTrigger tenant={tenant} />}
        </TabsList>
        <TabsContent value={"general"} className={"px-8 pb-8"}>
          <div className={"flex flex-col gap-6"}>
            <div className={""}>
              <Label>Name</Label>
              <HelpText>
                Set an easily recognizable name for the tenant.
              </HelpText>

              <Input
                autoFocus={true}
                tabIndex={0}
                value={name}
                data-testid={"name"}
                onChange={(e) => setName(e.target.value)}
                placeholder={"Acme Inc."}
                className={"min-w-[270px]"}
              />
            </div>
            <div className={""}>
              <Label>Domain</Label>
              {!tenant ? (
                <HelpText>Enter the primary domain of the tenant.</HelpText>
              ) : (
                <HelpText>Primary domain of the tenant.</HelpText>
              )}

              {tenant ? (
                <Card className={"w-full justify-between flex p-4 pl-5"}>
                  <div className={"flex flex-col"}>
                    <span
                      className={
                        "text-sm text-nb-gray-100 mb-1 flex gap-2 items-center"
                      }
                    >
                      {domain}
                    </span>
                    <span
                      className={cn(
                        "text-xs flex items-center gap-1.5 text-nb-gray-300 font-medium",
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          isActive ? "bg-green-400" : "bg-yellow-400",
                        )}
                      ></span>
                      {isActive ? "Ownership Verified" : "Pending Verification"}
                    </span>
                  </div>
                  <div className={"flex gap-2 items-center"}>
                    {!isActive && (
                      <Button
                        variant={"secondary"}
                        size={"xs"}
                        onClick={() => verifyDomain(tenant, true)}
                      >
                        <ShieldCheckIcon size={14} />
                        Verify Domain
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <Input
                  customPrefix={<GlobeIcon size={16} />}
                  autoFocus={false}
                  tabIndex={0}
                  value={domain}
                  error={domainInputError}
                  data-testid={"name"}
                  disabled={tenant}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder={"acme.de"}
                  className={"w-full"}
                />
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value={"permissions"} className={"px-8 pb-6"}>
          <MSPTenantPermissionsTab
            groups={groups}
            onGroupsChange={setGroups}
            tenantGroups={tenantGroups}
            setTenantGroups={setTenantGroups}
          />
        </TabsContent>
        {tenant && <MSPTenantPlanTab tenant={tenant} />}
      </Tabs>
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
              <MSPTenantDocsLink />
            )}
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          {tab === "general" && !tenant && (
            <>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>Cancel</Button>
              </ModalClose>
              <Button
                variant={"primary"}
                disabled={!canContinue}
                onClick={() => setTab("permissions")}
              >
                Continue
              </Button>
            </>
          )}
          {tab === "permissions" && !tenant && (
            <>
              <Button variant={"secondary"} onClick={() => setTab("general")}>
                Back
              </Button>
              <Button
                variant={"primary"}
                onClick={createTenant}
                disabled={!canContinue}
              >
                <PlusCircle size={16} />
                Add Account
              </Button>
            </>
          )}
          {tenant && (
            <>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>Cancel</Button>
              </ModalClose>
              {tab !== "plan" && (
                <Button
                  variant={"primary"}
                  disabled={!hasChanges || !canContinue}
                  onClick={updateTenant}
                >
                  Save Changes
                </Button>
              )}
            </>
          )}
        </div>
      </ModalFooter>
    </ModalContent>
  );
};
