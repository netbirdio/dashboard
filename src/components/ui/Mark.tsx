import useCopyToClipboard from "@hooks/useCopyToClipboard";
import { cn } from "@utils/helpers";
import { Copy } from "lucide-react";
import * as React from "react";

type Props = {
  children: React.ReactNode;
  copy?: boolean;
};
export const Mark = ({ children, copy = false }: Props) => {
  const [ref, copyToClipBoard] = useCopyToClipboard();

  return (
    <>
      {" "}
      <i
        onClick={() => copy && copyToClipBoard()}
        // A copyable mark acts as a button, so it has to be reachable and usable by keyboard.
        role={copy ? "button" : undefined}
        tabIndex={copy ? 0 : undefined}
        onKeyDown={(e) => {
          if (!copy || (e.key !== "Enter" && e.key !== " ")) return;
          e.preventDefault();
          copyToClipBoard();
        }}
        ref={ref}
        className={cn(
          "inline-flex not-italic gap-2 bg-nb-gray-900 py-[2px] px-2 rounded-md text-[12px] items-center mx-[1px] -top-[1px] relative my-[2.5px]",
          copy &&
            "cursor-pointer hover:text-nb-gray-100 hover:bg-nb-gray-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-netbird",
        )}
      >
        {children}
        {copy && <Copy size={11} />}
      </i>{" "}
    </>
  );
};
