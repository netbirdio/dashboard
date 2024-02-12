import Card from "@components/Card";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn, generateColorFromString } from "@utils/helpers";
import dayjs from "dayjs";
import { AlertCircle, ArrowUpRight, Cog, PlusIcon, XIcon } from "lucide-react";
import React, { useMemo } from "react";
import { useUsers } from "@/contexts/UsersProvider";
import { ActivityEvent } from "@/interfaces/ActivityEvent";
import ActivityDescription from "@/modules/activity/ActivityDescription";
import ActivityTypeIcon from "@/modules/activity/ActivityTypeIcon";
import { getColorFromCode } from "@/modules/activity/utils";

export const ActivityEntryRow = ({ event }: { event: ActivityEvent }) => {
  const { users } = useUsers();

  const user = users
    ? users.find((user) => user.id === event.initiator_id)
    : undefined;

  const icons = {
    green: <PlusIcon size={12} />,
    "blue-darker": <ArrowUpRight size={12} />,
    red: <XIcon size={12} />,
    netbird: <AlertCircle size={12} />,
  };

  const color = useMemo(() => {
    return getColorFromCode(event.activity_code);
  }, [event.activity_code]);

  return (
    <div className={"flex items-start gap-6 relative max-w-[735px] pb-10"}>
      <VerticalLine />

      <div
        className={cn(
          "w-10 h-10 shrink-0 relative rounded-full border-0 bg-nb-gray-900 border-nb-gray-800 flex items-center justify-center uppercase text-sm font-medium text-nb-gray-300",
        )}
      >
        <ActivityTypeIcon code={event.activity_code} />
        <div
          className={cn(
            "w-6 h-6 absolute -right-1 -bottom-1 bg-nb-gray-930 rounded-full flex items-center justify-center border-4 border-nb-gray-950",
            color == "red" && "bg-red-950 text-red-500 ",
            color == "green" && "bg-green-950 text-green-400 ",
            color == "blue-darker" && "bg-sky-950 text-sky-500 ",
            color == "netbird" && "bg-netbird-950 text-netbird-500",
          )}
        >
          {color && icons[color]}
        </div>
      </div>

      <div className={"flex flex-col w-full gap-2"}>
        <div className={"flex justify-between"}>
          <div>
            <div className={"flex items-center gap-2"}>
              <div
                className={
                  "w-4 h-4 rounded-full flex items-center justify-center text-white uppercase text-[9px] font-medium bg-nb-gray-900"
                }
                style={{
                  color: user?.name
                    ? generateColorFromString(
                        user?.name || user?.id || "System User",
                      )
                    : "#808080",
                }}
              >
                {!user?.name && !user?.id && <Cog size={12} />}
                {user?.name?.charAt(0) || user?.id?.charAt(0)}
              </div>

              <span className={"text-sm text-nb-gray-200"}>
                <TextWithTooltip
                  text={user?.name || user?.id || "System"}
                  maxChars={20}
                />
              </span>
              <span className={"text-sm text-nb-gray-400 font-light"}>
                <TextWithTooltip text={user?.email || ""} maxChars={20} />
              </span>
            </div>
          </div>

          <span
            className={"flex gap-2 items-center text-nb-gray-400 text-xs mr-1"}
          >
            <div className={"h-1 w-1 bg-nb-gray-700 rounded-full"}></div>
            {dayjs(event?.timestamp).format("MMM D, YYYY [at] h:mm:s A")}
          </span>
        </div>

        <Card
          className={
            "w-full relative bg-nb-gray-925 text-sm text-nb-gray-300 flex flex-col px-4 pt-3 pb-3"
          }
        >
          <div className={"flex gap-4"}>
            <div
              className={
                "flex items-center text-nb-gray-300 text-sm leading-[2]"
              }
            >
              <ActivityDescription event={event} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

function VerticalLine() {
  return (
    <div
      className={
        "absolute left-0 top-0 translate-y-12 h-[56%] bg-nb-gray-900/50 w-[2px] ml-[20px] z-0"
      }
    ></div>
  );
}
