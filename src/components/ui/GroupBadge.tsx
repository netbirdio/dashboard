import Badge from "@components/Badge";
import { NewBadge } from "@components/ui/NewBadge";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn } from "@utils/helpers";
import { FolderGit2, XIcon } from "lucide-react";
import * as React from "react";
import { Group } from "@/interfaces/Group";

type Props = {
  group: Group;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  showX?: boolean;
  children?: React.ReactNode;
  className?: string;
  showNewBadge?: boolean;
};
export default function GroupBadge({
  onClick,
  group,
  showX = false,
  children,
  className,
  showNewBadge = false,
}: Props) {
  const isNew = !group?.id;

  return (
    <Badge
      key={group.id || group.name}
      useHover={true}
      data-cy={"group-badge"}
      variant={"gray-ghost"}
      className={cn("transition-all group whitespace-nowrap", className)}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
    >
      <FolderGit2 size={12} className={"shrink-0"} />

      <TextWithTooltip text={group?.name || ""} maxChars={20} />
      {children}
      {isNew && showNewBadge && <NewBadge />}
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
