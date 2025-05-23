import FullTooltip from "@components/FullTooltip";
import { ScrollArea } from "@components/ScrollArea";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn, generateColorFromString } from "@utils/helpers";
import { orderBy } from "lodash";
import * as React from "react";
import { User } from "@/interfaces/User";
import { SmallUserAvatar } from "@/modules/users/SmallUserAvatar";

type Props = {
  users: User[];
  max?: number;
  avatarClassName?: string;
  side?: "left" | "right" | "top" | "bottom";
};

export const HorizontalUsersStack = ({
  users,
  max = 3,
  avatarClassName,
  side = "top",
}: Props) => {
  let usersToDisplay = orderBy(users?.slice(0, max) || [], ["name"]);

  return (
    <FullTooltip
      side={side}
      contentClassName={"p-0"}
      content={
        <ScrollArea
          className={"max-h-[275px] overflow-y-auto flex flex-col px-3"}
        >
          <div
            className={"flex flex-col gap-2.5"}
            onClick={(e) => e.stopPropagation()}
          >
            {orderBy(users, ["name"])?.map((user, index) => (
              <div
                className={"flex items-center gap-2 first:pt-2 last:pb-2 pr-6"}
                key={user?.id || index}
              >
                <SmallUserAvatar
                  name={user?.name}
                  email={user?.email}
                  id={user?.id}
                />

                <div className={"flex flex-col text-xs"}>
                  <span className={" text-nb-gray-200"}>
                    <TextWithTooltip
                      text={
                        user?.email === "NetBird"
                          ? "System"
                          : user?.name || user?.id
                      }
                      maxChars={500}
                    />
                  </span>
                  <span className={"text-nb-gray-350 font-light"}>
                    <TextWithTooltip
                      text={user?.email || "NetBird"}
                      maxChars={500}
                    />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      }
      disabled={users?.length === 0}
      skipDelayDuration={200}
      delayDuration={300}
    >
      <div
        className={cn("flex items-center", "group/user-stack cursor-default")}
      >
        {usersToDisplay.map((user, index) => (
          <div
            key={user.id || index}
            className={cn("relative", index !== 0 ? "-ml-2.5" : "")}
            style={{
              zIndex: index + 1,
            }}
          >
            <UserAvatarCircle
              name={user.name}
              className={avatarClassName}
              hoverEffect={true}
            />
          </div>
        ))}

        <div
          className={cn(
            "text-neutral-500 dark:text-nb-gray-300 font-medium flex items-center gap-2 text-xs ml-1.5 transition-colors whitespace-nowrap",
            users.length > 0 && "group-hover/user-stack:text-nb-gray-200 ",
          )}
        >
          {users?.length || 0} User(s)
        </div>
      </div>
    </FullTooltip>
  );
};

const UserAvatarCircle = ({
  name,
  className,
  hoverEffect = false,
}: {
  name: string;
  className?: string;
  hoverEffect?: boolean;
}) => {
  return (
    <div
      className={cn(
        "w-6 h-6 bg-nb-gray-900 flex items-center shrink-0 rounded-full justify-center text-[0.6rem] font-medium relative uppercase shadow-xl",
        "border-nb-gray-940 border-2 transition-all",
        hoverEffect && "group-hover/user-stack:bg-nb-gray-800",
        className,
      )}
      style={{
        color: generateColorFromString(name),
      }}
    >
      <span className={"leading-none"}>{name.charAt(0)}</span>
    </div>
  );
};
