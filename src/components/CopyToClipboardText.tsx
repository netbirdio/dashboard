import { cn } from "@utils/helpers";
import { CheckIcon, CopyIcon } from "lucide-react";
import React from "react";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";

type Props = {
  children: React.ReactNode;
  message?: string;
};

export default function CopyToClipboardText({ children, message }: Props) {
  const [wrapper, copyToClipboard, copied] = useCopyToClipboard();

  return (
    <div
      className={cn(
        "flex gap-2 items-center group cursor-pointer transition-all hover:underline underline-offset-4 decoration-dashed decoration-nb-gray-600",
        !copied && "hover:opacity-90",
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
          className={"text-nb-gray-100 opacity-0 group-hover:opacity-100"}
          size={12}
        />
      ) : (
        <CopyIcon
          className={"text-nb-gray-100 opacity-0 group-hover:opacity-100"}
          size={12}
        />
      )}
    </div>
  );
}
