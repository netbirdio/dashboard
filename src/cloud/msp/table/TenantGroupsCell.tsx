import Badge from "@components/Badge";
import Button from "@components/Button";
import { ScrollArea } from "@components/ScrollArea";
import GroupBadge from "@components/ui/GroupBadge";
import * as HoverCard from "@radix-ui/react-hover-card";
import { IconCirclePlus } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { orderBy } from "lodash";
import { ArrowRightIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useTenants } from "@/cloud/msp/contexts/TenantsProvider";
import {
  Tenant,
  TenantGroup,
  TenantStatus,
} from "@/cloud/msp/interfaces/Tenant";
import { useGroups } from "@/contexts/GroupsProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { Group } from "@/interfaces/Group";
import { HorizontalUsersStack } from "@/modules/users/HorizontalUsersStack";
import { UserRoles } from "@/modules/users/UserRoleSelector";

type Props = {
  tenant: Tenant;
};
export const TenantGroupsCell = ({ tenant }: Props) => {
  const { groups } = useGroups();
  const { openEditTenantModal } = useTenants();
  const isPending = tenant.status === TenantStatus.Pending;
  const isActive = tenant.status === TenantStatus.Active;
  const canEdit = isPending || isActive;

  const tenantGroups = useMemo(() => {
    return tenant.groups?.map(
      (tenantGroup) =>
        ({
          ...tenantGroup,
          name: groups?.find((g) => g.id === tenantGroup.id)?.name,
        }) as TenantGroup,
    );
  }, [tenant.groups, groups]);

  if (tenantGroups?.length === 0)
    return (
      <Button
        onClick={() => openEditTenantModal(tenant, "permissions")}
        variant={"secondary"}
        size={"xs"}
        disabled={!canEdit}
        className={"max-h-[38px]"}
      >
        <IconCirclePlus size={14} />
        Add Groups
      </Button>
    );

  return (
    <MultipleGroupsWithUser
      tenantGroups={orderBy(tenantGroups, ["name"])}
      onClick={() => openEditTenantModal(tenant, "permissions")}
    />
  );
};

type MultipleGroupsWithUserProps = {
  tenantGroups: TenantGroup[];
  onClick?: () => void;
};

const MultipleGroupsWithUser = ({
  tenantGroups,
  onClick,
}: MultipleGroupsWithUserProps) => {
  const firstGroup = tenantGroups.length > 0 ? tenantGroups[0] : undefined;
  const otherGroups = tenantGroups.length > 0 ? tenantGroups.slice(1) : [];
  const [isClicked, setIsClicked] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsClicked(true);
    setOpen(false);
    onClick?.();
    setTimeout(() => setIsClicked(false), 300);
  };

  return (
    <HoverCard.Root
      openDelay={10}
      closeDelay={100}
      open={open && !isClicked} // Only open if not clicked
      onOpenChange={(newOpen) => !isClicked && setOpen(newOpen)}
    >
      <HoverCard.Trigger asChild={true} onClick={handleClick}>
        <button
          className={cn("inline-flex items-center gap-2 z-0 cursor-pointer")}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseEnter={() => !isClicked && setOpen(true)}
        >
          {firstGroup && (
            <GroupBadge group={firstGroup as Group} hideTooltip={true} />
          )}
          {otherGroups && otherGroups.length > 0 && (
            <Badge
              variant={"gray-ghost"}
              useHover={true}
              className={"px-3 gap-2 whitespace-nowrap"}
            >
              + {otherGroups.length}
            </Badge>
          )}
        </button>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          alignOffset={20}
          sideOffset={7}
          side={"top"}
          className={cn(
            "z-[9999] overflow-hidden rounded-md border border-neutral-200 bg-white text-sm text-neutral-950 shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-nb-gray-930 dark:bg-nb-gray-940 dark:text-neutral-50",
          )}
        >
          <ScrollArea
            className={"max-h-[285px] overflow-y-auto flex flex-col px-5 pt-4"}
          >
            <div className={"flex flex-col gap-2 items-start mb-2 last:pb-2"}>
              {tenantGroups.map((group) => (
                <GroupWithUserItem key={group.id} group={group} />
              ))}
            </div>
          </ScrollArea>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
};

const GroupWithUserItem = ({ group }: { group: TenantGroup }) => {
  const { users } = useUsers();
  const usersOfGroup =
    users?.filter((user) => user.auto_groups.includes(group.id as string)) ||
    [];
  const selectedRole = UserRoles.find((r) => r.value === group.role);

  return (
    <div className={"flex items-center gap-2 justify-between w-full"}>
      <div key={group.id} className={"flex gap-2 items-center"}>
        <GroupBadge group={group as Group} maxChars={20} />
        <ArrowRightIcon size={14} />
        <HorizontalUsersStack users={usersOfGroup} side={"right"} />
      </div>

      {selectedRole && (
        <div className={"flex justify-end ml-10"}>
          <div
            className={
              "text-[0.82rem] text-nb-gray-300 flex gap-2 items-center whitespace-nowrap font-medium"
            }
          >
            <selectedRole.icon size={14} width={14} className={"shrink-0"} />
            {selectedRole?.name}
          </div>
        </div>
      )}
    </div>
  );
};

const GroupSuffix = () => {
  const oneOrTwo = Math.random() > 0.5 ? 1 : 2;
  const selectedRole = UserRoles[oneOrTwo];
  return (
    <div
      className={
        "h-full relative flex items-center justify-center bg-nb-gray-800/40 border-l border-nb-gray-800 pr-2.5 ml-2"
      }
    >
      <div
        className={cn(
          "text-[0.7rem] justify-center  h-full w-full",
          "flex gap-1 items-center h-full py-1.5",
          "ml-2",
        )}
      >
        <selectedRole.icon size={12} width={12} className={"shrink-0"} />
        {selectedRole?.name}
      </div>
    </div>
  );
};
