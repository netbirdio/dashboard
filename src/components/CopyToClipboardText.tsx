import { cn } from "@utils/helpers";
import { CheckIcon, CopyIcon } from "lucide-react";
import React from "react";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";

type Props = {
  children: React.ReactNode;
  message?: string;
  iconAlignment?: "left" | "right";
  className?: string;
  alwaysShowIcon?: boolean;
};

export default function CopyToClipboardText({
  children,
  message,
  iconAlignment = "right",
  className,
  alwaysShowIcon = false,
}: Props) {
  const [wrapper, copyToClipboard, copied] = useCopyToClipboard();

  return (
    <div
      className={cn("flex gap-2 items-center group cursor-pointer", className)}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        copyToClipboard(message).then();
      }}
      ref={wrapper}
    >
      <span className="relative truncate">
        {children}
        <span className="absolute bottom-0 left-0 right-0 border-b border-dashed border-transparent group-hover:border-nb-gray-500 pointer-events-none" />
      </span>

      <span
        className={cn(
          "shrink-0",
          iconAlignment === "left" ? "order-first" : "order-last",
        )}
      >
        <CheckIcon
          className={cn(
            "text-nb-gray-100 group-hover:opacity-100",
            !copied && "hidden",
            !alwaysShowIcon && !copied && "opacity-0",
          )}
          size={11}
        />
        <CopyIcon
          className={cn(
            "text-nb-gray-100 group-hover:opacity-100",
            copied && "hidden",
            !alwaysShowIcon && "opacity-0",
          )}
          size={11}
        />
      </span>
    </div>
  );
}
