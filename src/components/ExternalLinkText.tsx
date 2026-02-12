import { cn } from "@utils/helpers";
import { ExternalLinkIcon } from "lucide-react";
import React from "react";

type Props = {
  href: string;
  children: React.ReactNode;
  iconAlignment?: "left" | "right";
  className?: string;
  alwaysShowIcon?: boolean;
};

export default function ExternalLinkText({
  href,
  children,
  iconAlignment = "right",
  className,
  alwaysShowIcon = false,
}: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex gap-2 items-center group/link cursor-pointer hover:opacity-90",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="relative">
        {children}
        <span className="absolute bottom-0 left-0 right-0 border-b border-dashed border-transparent group-hover/link:border-nb-gray-500 pointer-events-none" />
      </span>
      <ExternalLinkIcon
        className={cn(
          "text-nb-gray-100 group-hover/link:opacity-100 shrink-0",
          iconAlignment === "left" ? "order-first" : "order-last",
          !alwaysShowIcon && "opacity-0",
        )}
        size={12}
      />
    </a>
  );
}
