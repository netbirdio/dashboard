import Badge from "@components/Badge";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn } from "@utils/helpers";
import { FolderGit2, XIcon } from "lucide-react";
import * as React from "react";
import { Group } from "@/interfaces/Group";

type Props = {
  group: Group;
  onClick?: () => void;
  showX?: boolean;
  children?: React.ReactNode;
  className?: string;
};
export default function GroupBadge({
  onClick,
  group,
  showX = false,
  children,
  className,
}: Props) {
  return (
    <Badge
      key={group.id}
      useHover={true}
      variant={"gray-ghost"}
      className={cn("transition-all group whitespace-nowrap", className)}
      onClick={onClick}
    >
      <FolderGit2 size={12} className={"shrink-0"} />
      <TextWithTooltip text={group?.name || ""} maxChars={20} />
      {children}
      {showX && (
        <XIcon
          size={12}
          className={"cursor-pointer group-hover:text-white shrink-0"}
        />
      )}
    </Badge>
  );
}
