import Badge from "@components/Badge";
import TruncatedText from "@components/ui/TruncatedText";
import { cn } from "@utils/helpers";
import { GlobeIcon, NetworkIcon, WorkflowIcon, XIcon } from "lucide-react";
import * as React from "react";
import { NetworkResource } from "@/interfaces/Network";

type Props = {
  resource?: NetworkResource;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  showX?: boolean;
  children?: React.ReactNode;
  className?: string;
};
export default function ResourceBadge({
  onClick,
  resource,
  showX = false,
  children,
  className,
}: Readonly<Props>) {
  if (!resource) return;

  return (
    <Badge
      key={resource.id || resource?.name}
      useHover={true}
      data-cy={"resource-badge"}
      variant={"gray-ghost"}
      className={cn("transition-all group whitespace-nowrap", className)}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
    >
      {resource.type === "host" && (
        <WorkflowIcon size={12} className={"shrink-0"} />
      )}
      {resource.type === "domain" && (
        <GlobeIcon size={12} className={"shrink-0"} />
      )}
      {resource.type === "subnet" && (
        <NetworkIcon size={12} className={"shrink-0"} />
      )}

      <TruncatedText text={resource?.name || ""} maxChars={20} />
      {children}
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
