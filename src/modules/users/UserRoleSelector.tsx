import Button from "@components/Button";
import { CommandItem } from "@components/Command";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { ScrollArea } from "@components/ScrollArea";
import { Command, CommandGroup, CommandList } from "cmdk";
import { trim } from "lodash";
import { ChevronsUpDown, Cog, User2 } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useElementSize } from "@/hooks/useElementSize";
import { Role } from "@/interfaces/User";

interface MultiSelectProps {
  value?: Role;
  onChange: (item: Role) => void;
  disabled?: boolean;
  popoverWidth?: "auto" | number;
  hideOwner?: boolean;
}

const UserRoles = [
  {
    name: "Owner",
    value: Role.Owner,
    icon: NetBirdIcon,
  },
  {
    name: "Admin",
    value: Role.Admin,
    icon: Cog,
  },
  {
    name: "User",
    value: Role.User,
    icon: User2,
  },
];

export function UserRoleSelector({
  onChange,
  value,
  disabled = false,
  popoverWidth = "auto",
  hideOwner = false,
}: MultiSelectProps) {
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();
  const { isOwner } = useLoggedInUser();

  const toggle = (item: Role) => {
    const isSelected = value == item;
    if (isSelected) {
    } else {
      onChange && onChange(item);
    }
    setOpen(false);
  };

  const [open, setOpen] = useState(false);

  const selectedRole = UserRoles.find((role) => role.value === value);

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
      }}
    >
      <PopoverTrigger asChild={true}>
        <Button
          variant={"input"}
          disabled={disabled}
          ref={inputRef}
          className={"w-full"}
        >
          <div className={"w-full flex justify-between items-center gap-2"}>
            {selectedRole && (
              <React.Fragment>
                <div className={"flex items-center gap-2.5"}>
                  <selectedRole.icon size={14} width={14} />
                  <div className={"flex flex-col text-sm font-medium"}>
                    <span className={"text-nb-gray-200"}>
                      {selectedRole?.name}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            )}

            <div className={"pl-2"}>
              <ChevronsUpDown size={18} className={"shrink-0"} />
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0 shadow-sm  shadow-nb-gray-950"
        style={{
          width: popoverWidth === "auto" ? width : popoverWidth,
        }}
        align="start"
        side={"bottom"}
        sideOffset={10}
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
            <ScrollArea
              className={
                "max-h-[380px] overflow-y-auto flex flex-col gap-1 pl-2 py-2 pr-3"
              }
            >
              <CommandGroup>
                <div className={"grid grid-cols-1 gap-1"}>
                  {UserRoles.map((item) => {
                    if (!isOwner && item.value === Role.Owner) return null;
                    if (hideOwner && item.value === Role.Owner) return null;

                    return (
                      <CommandItem
                        key={item.value}
                        value={item.value}
                        className={"py-1 px-2"}
                        onSelect={() => toggle(item.value)}
                        onClick={(e) => e.preventDefault()}
                      >
                        <div className={"flex items-center gap-2.5 p-1"}>
                          <item.icon size={14} width={14} />
                          <div className={"flex flex-col text-sm font-medium"}>
                            <span className={"text-nb-gray-200"}>
                              {item.name}
                            </span>
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </div>
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
