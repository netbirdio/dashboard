import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import GroupBadge from "@components/ui/GroupBadge";
import { cn } from "@utils/helpers";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  MinusCircleIcon,
  PlusIcon,
} from "lucide-react";
import * as React from "react";
import { TenantGroup } from "@/cloud/msp/interfaces/Tenant";
import { useUsers } from "@/contexts/UsersProvider";
import { Group } from "@/interfaces/Group";
import { Role } from "@/interfaces/User";
import { HorizontalUsersStack } from "@/modules/users/HorizontalUsersStack";
import { UserRoles, UserRoleSelector } from "@/modules/users/UserRoleSelector";

type Props = {
  groups: Group[];
  onGroupsChange: React.Dispatch<React.SetStateAction<Group[]>>;
  tenantGroups?: TenantGroup[];
  setTenantGroups: React.Dispatch<React.SetStateAction<TenantGroup[]>>;
};

export const MSPTenantPermissionsTab = ({
  groups,
  onGroupsChange,
  tenantGroups,
  setTenantGroups,
}: Props) => {
  const { users } = useUsers();

  const handleGroupRemove = (group: Group) => {
    onGroupsChange((prev) => prev.filter((g) => g.name !== group.name));
    setTenantGroups((prev) => prev.filter((g) => g.name !== group.name));
  };

  const handleListItemChange = (group: Group, role: Role) => {
    const tenantGroup = tenantGroups?.find((g) => g.id === group.id);
    if (tenantGroup) {
      setTenantGroups((prev) =>
        prev.map((g) => (g.id === group.id ? { ...g, role } : g)),
      );
    } else {
      setTenantGroups((prev) => [
        ...(prev || []),
        { id: group.id, name: group.name, role },
      ]);
    }
  };

  return (
    <div>
      <div className={"flex gap-4 justify-between w-full items-start"}>
        <div>
          <Label>Permissions (required)</Label>
          <HelpText>
            Add user groups to grant them access to this tenant.
          </HelpText>
        </div>
        <div>
          <PeerGroupSelector
            customTrigger={
              <Button
                variant={"secondary"}
                size={"xs"}
                stopPropagation={false}
                className={"pl-3"}
              >
                <PlusIcon size={14} />
                Add Group
              </Button>
            }
            onChange={onGroupsChange}
            values={groups}
            hideAllGroup={true}
            popoverWidth={450}
            showResourceCounter={false}
            align={"end"}
            users={users}
          />
        </div>
      </div>

      {groups?.length > 0 && (
        <div
          className={cn(
            "rounded-md overflow-hidden mt-3 py-2.5",
            "border border-nb-gray-900 bg-nb-gray-920/30",
          )}
        >
          {groups.map((group) => {
            const tenantGroup = tenantGroups?.find((g) => g.id === group.id);

            return (
              <ListItem
                group={group}
                key={group?.id || group?.name}
                role={tenantGroup?.role}
                onRemove={() => handleGroupRemove(group)}
                onChange={(role) => handleListItemChange(group, role)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

type ListItemProps = {
  group: Group;
  onRemove?: () => void;
  role?: Role;
  onChange: (role: Role) => void;
};

const ListItem = ({
  group,
  onRemove,
  onChange,
  role = Role.Admin,
}: ListItemProps) => {
  const { users } = useUsers();
  const selectedRole = UserRoles.find((r) => r.value === role) || UserRoles[0];

  const usersOfGroup =
    users?.filter((user) => user.auto_groups.includes(group.id as string)) ||
    [];

  return (
    <div
      key={group.id}
      className={"flex justify-between items-center py-2 px-4"}
    >
      <div className={"flex items-center gap-2"}>
        <GroupBadge group={group} showNewBadge={true} />
        <ArrowRightIcon size={14} />
        <HorizontalUsersStack users={usersOfGroup} />
      </div>
      <div className={"flex items-center gap-1 justify-end"}>
        <UserRoleSelector
          value={role}
          onChange={onChange}
          hideOwner={true}
          hideBillingAdmin={true}
          popoverWidth={200}
          align={"end"}
          customTrigger={
            <Button
              variant={"default-outline"}
              size={"xs"}
              className={cn(
                "!text-[0.82rem] pr-2 pl-3 !text-nb-gray-300 h-[35px]",
                "group-data-[state=open]/user-role-selector:bg-nb-gray-900/30 group-data-[state=open]/user-role-selector:border-nb-gray-800/50",
              )}
              stopPropagation={false}
            >
              <selectedRole.icon size={14} width={14} />
              {selectedRole?.name}
              <ChevronDownIcon size={14} />
            </Button>
          }
        />
        <Button
          className={"h-[35px]"}
          variant={"default-outline"}
          onClick={onRemove}
        >
          <MinusCircleIcon size={14} />
        </Button>
      </div>
    </div>
  );
};
