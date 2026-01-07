import Button from "@components/Button";
import TruncatedText from "@components/ui/TruncatedText";
import useFetchApi from "@utils/api";
import { cn, generateColorFromUser } from "@utils/helpers";
import { Cog } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { User } from "@/interfaces/User";

type Props = {
  userId: string;
};

export const ControlCenterCurrentUserBadge = ({ userId }: Props) => {
  const { data: users, isLoading: isUsersLoading } =
    useFetchApi<User[]>("/users");

  const user = useMemo(() => {
    if (!users) return undefined;
    return users?.find((u) => u.id === userId);
  }, [users, userId]);

  return (
    user && (
      <Button
        variant={"secondary"}
        size={"xs"}
        className={
          "!bg-nb-gray-930 !text-nb-gray-300 cursor-default h-[40px] !pl-2.5"
        }
      >
        <div className={cn("flex items-center justify-center gap-2.5")}>
          <div
            className={
              "w-6 h-6 rounded-full relative flex items-center justify-center text-white uppercase text-md font-medium bg-nb-gray-900"
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
                "font-normal text-[0.7rem] text-nb-gray-100 flex items-center gap-2"
              }
            >
              {user.name || user.id}
            </span>

            <TruncatedText
              text={user?.email}
              maxWidth={"380px"}
              className={
                "text-[0.7rem] font-normal text-nb-gray-400 relative -top-[0.2rem]"
              }
            />
          </div>
        </div>
      </Button>
    )
  );
};
