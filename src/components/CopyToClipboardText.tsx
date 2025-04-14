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
      className={cn(
        "flex gap-2 items-center group cursor-pointer transition-all hover:underline underline-offset-4 decoration-dashed decoration-nb-gray-600",
        !copied && "hover:opacity-90",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        copyToClipboard(message).then();
      }}
      ref={wrapper}
    >
      {children}

      {copied ? (
        <CheckIcon
          className={cn(
            "text-gray-500 dark:text-nb-gray-100 group-hover:opacity-100 shrink-0",
            iconAlignment === "left" ? "order-first" : "order-last",
            !alwaysShowIcon && "opacity-0",
          )}
          size={11}
        />
      ) : (
        <CopyIcon
          className={cn(
            "text-gray-500 dark:text-nb-gray-100 group-hover:opacity-100 shrink-0",
            iconAlignment === "left" ? "order-first" : "order-last",
            !alwaysShowIcon && "opacity-0",
          )}
          size={11}
        />
      )}
    </div>
  );
}
