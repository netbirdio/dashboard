import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { useRouter } from "next/navigation";
import React from "react";

type Props = {
  icon: React.ReactNode;
  count: number;
  groupName: string;
  text?: string;
  href?: string;
  hidden?: boolean;
};
export default function GroupsCountCell({
  icon,
  count = 0,
  groupName,
  text,
  href,
  hidden = false,
}: Props) {
  const router = useRouter();

  const handleClick = () => {
    href && router.push(href);
  };

  return (
    !hidden && (
      <FullTooltip
        className={"w-full"}
        content={
          <div className={"text-xs"}>
            Group{" "}
            <span className={"text-netbird font-medium"}>{groupName}</span> is
            used in <span className={"font-medium text-netbird"}>{count}</span>{" "}
            {text}
          </div>
        }
        disabled={count === 0}
      >
        <Badge
          variant={"gray"}
          useHover={!!href}
          onClick={href ? handleClick : undefined}
          className={cn(
            "gap-2 w-full",
            count === 0 && "opacity-30",
            href && "cursor-pointer",
          )}
        >
          {icon}
          {count}
        </Badge>
      </FullTooltip>
    )
  );
}
