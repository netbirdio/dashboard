import TextWithTooltip from "@components/ui/TextWithTooltip";
import { generateColorFromUser } from "@utils/helpers";
import * as React from "react";
import { useMemo } from "react";
import { useUsers } from "@/contexts/UsersProvider";
import { ReverseProxyEvent } from "@/interfaces/ReverseProxy";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  event: ReverseProxyEvent;
};

export const ReverseProxyEventsUserCell = ({ event }: Props) => {
  const { users } = useUsers();

  const user = useMemo(() => {
    if (!event.user_id) return undefined;
    return users?.find((u) => u.id === event.user_id);
  }, [users, event.user_id]);

  if (!event.user_id) {
    return <EmptyRow />;
  }

  const displayName = user?.name || event.user_id;
  const displayEmail = user?.email || "";

  const userForColor = user || {
    id: event.user_id,
    name: displayName,
    email: displayEmail,
  };

  return (
    <div className={"flex items-center gap-2 py-2 px-3"}>
      <div
        className={
          "w-8 h-8 rounded-full flex items-center justify-center text-white uppercase text-xs font-medium bg-nb-gray-900 shrink-0"
        }
        style={{
          color: generateColorFromUser(userForColor),
        }}
      >
        {displayName?.charAt(0) || "?"}
      </div>

      <div className="flex flex-col gap-0 min-w-0">
        <span className={"text-sm text-nb-gray-200 truncate"}>
          <TextWithTooltip text={displayName} maxChars={20} />
        </span>
        {displayEmail && (
          <span className={"text-xs text-nb-gray-400 font-light truncate"}>
            <TextWithTooltip text={displayEmail} maxChars={25} />
          </span>
        )}
      </div>
    </div>
  );
};
