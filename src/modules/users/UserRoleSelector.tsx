import Button from "@components/Button";
import { CommandItem } from "@components/Command";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { ScrollArea } from "@components/ScrollArea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { cn } from "@utils/helpers";
import { isNetBirdCloud } from "@utils/netbird";
import { Command, CommandGroup, CommandList } from "cmdk";
import { trim } from "lodash";
import {
  ChevronsUpDown,
  Cog,
  CreditCard,
  EyeIcon,
  GaugeIcon,
  NetworkIcon,
  User2,
  UsersIcon,
} from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { useMSP } from "@/cloud/msp/contexts/MSPProvider";
import { useDialog } from "@/contexts/DialogProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useElementSize } from "@/hooks/useElementSize";
import { useTranslations } from "@/i18n/LocaleProvider";
import type { MessageId } from "@/i18n/translate";
import { Role, User } from "@/interfaces/User";
import { useAgentNetworkMode } from "@/modules/agent-network/useAgentNetworkMode";

interface MultiSelectProps {
  value?: Role;
  onChange: (item: Role) => void;
  disabled?: boolean;
  popoverWidth?: "auto" | number;
  hideOwner?: boolean;
  hideBillingAdmin?: boolean;
  currentUser?: User;
  customTrigger?: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

// Roles are grouped by the product surface they grant access to, so the list
// stays readable as more surfaces ship their own delegated roles. Add a
// category here (and a `category` on the roles) when the next surface lands.
export type UserRoleCategory = "general" | "agent-network";

type IconComponent = React.ComponentType<{
  size?: number;
  width?: number;
  className?: string;
}>;

export const UserRoleCategories: {
  value: UserRoleCategory;
  nameId: MessageId;
  icon: IconComponent;
}[] = [
  { value: "general", nameId: "users.roleCategoryGeneral", icon: UsersIcon },
  {
    value: "agent-network",
    nameId: "common.agentNetwork",
    icon: AgentNetworkIcon,
  },
];

export const UserRoles: {
  nameId: MessageId;
  // Label used inside the role's own tab, where the category is already in the
  // tab title — "Agent Network Admin" reads as just "Admin" under Agent Network.
  shortNameId?: MessageId;
  value: Role;
  icon: IconComponent;
  category: UserRoleCategory;
  descriptionId: MessageId;
}[] = [
  {
    nameId: "users.owner",
    value: Role.Owner,
    icon: NetBirdIcon,
    category: "general",
    descriptionId: "users.ownerDescription",
  },
  {
    nameId: "users.admin",
    value: Role.Admin,
    icon: Cog,
    category: "general",
    descriptionId: "users.adminDescription",
  },
  {
    nameId: "users.networkAdmin",
    value: Role.NetworkAdmin,
    icon: NetworkIcon,
    category: "general",
    descriptionId: "users.networkAdminDescription",
  },
  {
    nameId: "users.billingAdmin",
    value: Role.BillingAdmin,
    icon: CreditCard,
    category: "general",
    descriptionId: "users.billingAdminDescription",
  },
  {
    nameId: "users.auditor",
    value: Role.Auditor,
    icon: EyeIcon,
    category: "general",
    descriptionId: "users.auditorDescription",
  },
  {
    nameId: "users.user",
    value: Role.User,
    icon: User2,
    category: "general",
    descriptionId: "users.userDescription",
  },
  {
    nameId: "common.agentNetworkAdmin",
    shortNameId: "users.admin",
    value: Role.AgentNetworkAdmin,
    icon: AgentNetworkIcon,
    category: "agent-network",
    descriptionId: "users.agentNetworkAdminDescription",
  },
  {
    nameId: "users.usageViewer",
    value: Role.UsageViewer,
    icon: GaugeIcon,
    category: "agent-network",
    descriptionId: "users.usageViewerDescription",
  },
];

const RoleList = ({
  roles,
  onSelect,
  useShortNames = false,
  fixedHeight = false,
}: {
  roles: typeof UserRoles;
  onSelect: (role: Role) => void;
  useShortNames?: boolean;
  // Reserve the same height for every tab. Tabs hold different numbers of
  // roles, and a popover that changes height mid-interaction gets re-positioned
  // by the collision handling — it would open downwards on a short tab and flip
  // upwards on a long one.
  fixedHeight?: boolean;
}) => {
  const t = useTranslations();
  return (
    <ScrollArea
      className={cn(
        "overflow-y-auto flex flex-col gap-1 pl-2 py-2 pr-3",
        fixedHeight ? "h-[240px]" : "max-h-[320px]",
      )}
    >
      <CommandGroup>
        <div className={"grid grid-cols-1 gap-1"}>
          {roles.map((item) => (
            <CommandItem
              key={item.value}
              value={item.value}
              data-testid={"user-role-selector-item"}
              className={"py-1 px-2"}
              onSelect={() => onSelect(item.value)}
              onClick={(e) => e.preventDefault()}
            >
              <div className={"flex items-start gap-2.5 p-1"}>
                <div className={"pt-[3px]"}>
                  <item.icon size={14} width={14} />
                </div>
                <div className={"flex flex-col text-sm font-medium"}>
                  <span className={"text-nb-gray-200 whitespace-nowrap"}>
                    {useShortNames
                      ? t(item.shortNameId ?? item.nameId)
                      : t(item.nameId)}
                  </span>
                  <span className={"text-xs font-normal text-nb-gray-400"}>
                    {t(item.descriptionId)}
                  </span>
                </div>
              </div>
            </CommandItem>
          ))}
        </div>
      </CommandGroup>
    </ScrollArea>
  );
};

export function UserRoleSelector({
  onChange,
  value,
  disabled = false,
  popoverWidth = "auto",
  hideOwner = false,
  hideBillingAdmin = false,
  currentUser,
  customTrigger,
  side = "bottom",
  align = "start",
}: Readonly<MultiSelectProps>) {
  const translate = useTranslations();
  const [inputRef, { width }] = useElementSize<
    HTMLButtonElement | HTMLDivElement
  >();
  const { isOwner } = useLoggedInUser();
  const { confirm } = useDialog();

  const toggle = async (item: Role) => {
    if (item === Role.Owner) {
      let ok = await confirm({
        title: translate("users.transferOwnership"),
        type: "warning",
        description: (
          <div className={"inline-block"}>
            {translate("users.transferOwnershipPrefix")}{" "}
            <span className={"text-netbird inline font-medium"}>{translate("users.owner")}</span>{" "}
            {translate("users.transferOwnershipTo")}{" "}
            {currentUser ? (
              <span className={"text-netbird inline font-medium"}>
                {currentUser.name}
              </span>
            ) : (
              translate("users.thisUser")
            )}{" "}
            {translate("users.transferOwnershipSuffix1")}{" "}
            <span className={"text-netbird inline font-medium"}>{translate("users.admin")}</span>{" "}
            {translate("users.transferOwnershipSuffix2")}
          </div>
        ),
      });
      if (!ok) return;
    }

    const isSelected = value == item;
    if (!isSelected) onChange && onChange(item);
    setOpen(false);
  };

  const [open, setOpen] = useState(false);

  const selectedRole = UserRoles.find((role) => role.value === value);

  // Cloud only
  const { isAccountWithMSPParent } = useMSP();

  const { enabled: agentNetworkEnabled } = useAgentNetworkMode();

  const categories = useMemo(() => {
    const isVisible = (role: Role) => {
      if (!isOwner && role === Role.Owner) return false;
      if (hideOwner && role === Role.Owner) return false;
      if (hideBillingAdmin && role === Role.BillingAdmin) return false;

      // Cloud only
      if (role === Role.BillingAdmin && !isNetBirdCloud()) return false;
      if (role === Role.BillingAdmin && isAccountWithMSPParent) return false;
      if (role === Role.Owner && isAccountWithMSPParent) return false;

      return true;
    };

    return UserRoleCategories.map((category) => ({
      ...category,
      roles: UserRoles.filter(
        (role) => role.category === category.value && isVisible(role.value),
      ),
    })).filter((category) => {
      // Deployments without the Agent Network surface don't get its roles.
      if (category.value === "agent-network" && !agentNetworkEnabled)
        return false;
      return category.roles.length > 0;
    });
  }, [
    isOwner,
    hideOwner,
    hideBillingAdmin,
    isAccountWithMSPParent,
    agentNetworkEnabled,
  ]);

  // A single group is just a list — the tab row would only add noise.
  const showTabs = categories.length > 1;
  const [tab, setTab] = useState<string>(
    selectedRole?.category ?? UserRoleCategories[0].value,
  );
  // Fall back to the first group when the remembered tab is not available, e.g.
  // when the role was cleared or a group got filtered out.
  const activeTab = categories.some((category) => category.value === tab)
    ? tab
    : (categories[0]?.value ?? UserRoleCategories[0].value);

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        // Open on the group the current role lives in, so the selection is
        // visible without hunting for it.
        if (isOpen && selectedRole) setTab(selectedRole.category);
      }}
    >
      <PopoverTrigger asChild={true}>
        {customTrigger ? (
          <div ref={inputRef} className={"group/user-role-selector"}>
            {customTrigger}
          </div>
        ) : (
          <Button
            variant={"input"}
            disabled={disabled}
            ref={inputRef}
            className={"w-full group/user-role-selector"}
            data-testid={"user-role-selector"}
          >
            <div
              className={
                "w-full flex justify-between items-center gap-2 min-w-0"
              }
            >
              {selectedRole && (
                <div className={"flex items-center gap-2.5 min-w-0"}>
                  <div className={"shrink-0 flex items-center"}>
                    <selectedRole.icon size={14} width={14} />
                  </div>
                  <div className={"flex flex-col text-sm font-medium min-w-0"}>
                    {/* Truncate instead of overflowing the button: role names
                        can be longer than the column they sit in. */}
                    <span className={"text-nb-gray-200 truncate"}>
                      {translate(selectedRole.nameId)}
                    </span>
                  </div>
                </div>
              )}

              <div className={"pl-2 shrink-0"}>
                <ChevronsUpDown size={18} className={"shrink-0"} />
              </div>
            </div>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0 shadow-sm shadow-nb-gray-950"
        style={{
          width: popoverWidth === "auto" ? width : popoverWidth,
          // The tab row needs more room than the trigger usually offers.
          minWidth: showTabs ? 320 : undefined,
        }}
        // When the popover is wider than the trigger, anchor it to the
        // trigger's right edge so the extra width grows inwards — the role
        // selector sits in a right-hand column, so growing to the right would
        // run off the screen.
        align={showTabs ? "end" : align}
        side={side}
        sideOffset={10}
        collisionPadding={12}
      >
        <Command
          className={"w-full flex"}
          loop
          filter={(value, search) => {
            const formatValue = trim(value.toLowerCase());
            const formatSearch = trim(search.toLowerCase());
            if (formatValue.includes(formatSearch)) return 1;
            return 0;
          }}
        >
          <CommandList className={"w-full"}>
            {showTabs ? (
              <Tabs value={activeTab} onValueChange={setTab}>
                <TabsList justify={"start"} className={"px-3"}>
                  {categories.map((category) => (
                    <TabsTrigger
                      key={category.value}
                      value={category.value}
                      className={"text-[.8rem] font-normal"}
                      data-testid={`user-role-selector-tab-${category.value}`}
                    >
                      <category.icon
                        size={14}
                        className={
                          "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
                        }
                      />
                      {translate(category.nameId)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {categories.map((category) => (
                  <TabsContent
                    key={category.value}
                    value={category.value}
                    className={"p-0 my-0 pt-0"}
                  >
                    <RoleList
                      roles={category.roles}
                      onSelect={toggle}
                      useShortNames={true}
                      fixedHeight={true}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <RoleList
                roles={categories.flatMap((category) => category.roles)}
                onSelect={toggle}
              />
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
