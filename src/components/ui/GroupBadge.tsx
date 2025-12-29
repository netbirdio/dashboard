import Badge from "@components/Badge";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { SmallBadge } from "@components/ui/SmallBadge";
import TruncatedText from "@components/ui/TruncatedText";
import { cn } from "@utils/helpers";
import { XIcon } from "lucide-react";
import * as React from "react";
import { Group } from "@/interfaces/Group";
import { useRouter } from "next/navigation";

type Props = {
  group: Group;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  showX?: boolean;
  children?: React.ReactNode;
  className?: string;
  showNewBadge?: boolean;
  maxChars?: number;
  maxWidth?: string;
  hideTooltip?: boolean;
  textClassName?: string;
  redirectGroupTab?: string;
  redirectToGroupPage?: boolean;
};

export default function GroupBadge({
  onClick,
  group,
  showX = false,
  children,
  className,
  showNewBadge = false,
  maxChars = 20,
  maxWidth,
  hideTooltip = false,
  textClassName,
  redirectGroupTab,
  redirectToGroupPage = false,
}: Readonly<Props>) {
  const isNew = !group?.id;
  const router = useRouter();

  const handleGroupPageRedirect = () => {
    if (!group?.id) return;
    let redirectUrl = `/group?id=${group.id}`;
    if (redirectGroupTab) {
      redirectUrl += `&tab=${encodeURIComponent(redirectGroupTab)}`;
    }
    router.push(redirectUrl);
  };

  return (
    <Badge
      key={group.id ?? group.name}
      useHover={!!onClick || redirectToGroupPage}
      data-cy={"group-badge"}
      variant={"gray-ghost"}
      className={cn("transition-all group whitespace-nowrap", className)}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
        if (redirectToGroupPage) handleGroupPageRedirect();
      }}
    >
      <GroupBadgeIcon id={group?.id} issued={group?.issued} />
      <TruncatedText
        text={group?.name || ""}
        maxChars={maxChars}
        maxWidth={maxWidth}
        className={textClassName}
        hideTooltip={hideTooltip}
      />
      {children}
      {isNew && showNewBadge && <SmallBadge />}
      {showX && (
        <XIcon
          size={12}
          className={
            "cursor-pointer group-hover:text-nb-gray-100 transition-all shrink-0"
          }
        />
      )}
    </Badge>
  );
}
