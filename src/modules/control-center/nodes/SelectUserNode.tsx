import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import useFetchApi from "@utils/api";
import { cn, generateColorFromUser } from "@utils/helpers";
import { Handle, type Node, Position } from "@xyflow/react";
import { sortBy } from "lodash";
import { ChevronsUpDown, Cog } from "lucide-react";
import * as React from "react";
import { User } from "@/interfaces/User";
import TruncatedText from "@components/ui/TruncatedText";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { SmallUserAvatar } from "@/modules/users/SmallUserAvatar";

type UserNodeProps = Node<
  {
    currentUser: string;
    onUserChange: (peerId: string) => void;
  },
  "selectUserNode"
>;

export const SelectUserNode = ({ data, id }: UserNodeProps) => {
  const { data: users } = useFetchApi<User[]>("/users?service_user=false");

  const userSelectOptions: SelectOption[] = sortBy(
    users?.map(
      (user) =>
        ({
          value: user.id,
          label: user.name,
          searchValue: `${user.id}${user.email}${user.name}`,
          renderItem: () => {
            return (
              <div className={"flex items-center gap-2 w-full"}>
                <SmallUserAvatar
                  name={user?.name}
                  email={user?.email}
                  id={user?.id}
                />
                <div className={"flex flex-col text-xs w-full"}>
                  <span
                    className={
                      "text-nb-gray-200 flex items-center gap-1.5 w-full"
                    }
                  >
                    <TextWithTooltip
                      text={user?.name || user?.id}
                      maxChars={20}
                    />
                  </span>
                  {user?.email && (
                    <span
                      className={
                        "text-nb-gray-400 font-light flex items-center gap-1"
                      }
                    >
                      <TextWithTooltip
                        text={user?.email || "NetBird"}
                        maxChars={20}
                      />
                    </span>
                  )}
                </div>
              </div>
            );
          },
        }) as SelectOption,
    ) || [],
    "label",
    "asc",
  );

  const user = users?.find((u) => u.id === data.currentUser);

  return (
    <div
      className={cn(
        "bg-nb-gray-930 border hover:bg-nb-gray-910 cursor-pointer border-nb-gray-800 rounded-lg overflow-hidden transition-all",
      )}
    >
      <SelectDropdown
        variant={"secondary"}
        value={data.currentUser}
        onChange={data.onUserChange}
        options={userSelectOptions}
        showSearch={true}
        searchPlaceholder={"Search user by name or email..."}
        popoverWidth={280}
        className={cn(
          "!bg-nb-gray-920  !hover:bg-nb-gray-925 !text-nb-gray-300",
        )}
        triggerClassName={"focus:outline-none focus-visible:outline-none"}
        size={"xs"}
        maxHeight={300}
      >
        <div
          className={"flex items-center justify-between gap-8 pr-3 py-2 pl-3"}
        >
          {user && <SelectedUser user={user} />}
          <ChevronsUpDown size={18} className={"shrink-0"} />
        </div>
      </SelectDropdown>
      <Handle
        type="source"
        position={Position.Right}
        id={"sr"}
        style={{
          height: 20,
          width: "1px",
          border: "none",
          backgroundColor: "#3f444b",
          borderRadius: "0px 4px 4px 0px",
          right: -2,
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={"tl"}
        className={"opacity-0"}
      />
    </div>
  );
};

export const SelectedUser = ({
  user,
  className,
}: {
  user: User;
  className?: string;
}) => {
  return (
    <div className={cn("flex items-center justify-center gap-2.5", className)}>
      <div
        className={
          "w-8 h-8 rounded-full relative flex items-center justify-center text-white uppercase text-md font-medium bg-nb-gray-900"
        }
        style={{
          color: generateColorFromUser(user),
        }}
      >
        {!user?.name && !user?.id && <Cog size={12} />}
        {user?.name?.charAt(0) || user?.id?.charAt(0)}
      </div>
      <div
        className={cn(
          "flex flex-col justify-center relative",
          user?.email && "top-[2px]",
        )}
      >
        <span
          className={
            "font-normal text-[0.85rem] text-nb-gray-100 flex items-center gap-2"
          }
        >
          {user.name || user.id}
        </span>

        <TruncatedText
          text={user?.email}
          maxWidth={"180px"}
          className={
            "text-sm font-normal text-nb-gray-400 relative -top-[0.2rem]"
          }
        />
      </div>
    </div>
  );
};
