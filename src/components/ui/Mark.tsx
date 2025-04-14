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
        ref={ref}
        className={cn(
          "inline-flex not-italic gap-2 bg-gray-100 dark:bg-nb-gray-900 py-[2px] px-2 rounded-md text-[12px] items-center mx-[1px] -top-[1px] relative my-[2.5px]",
          copy &&
            "cursor-pointer hover:text-gray-700 dark:hover:text-nb-gray-100 hover:bg-gray-200 dark:hover:bg-nb-gray-800 transition-all",
        )}
      >
        {children}
        {copy && <Copy size={11} />}
      </i>{" "}
    </>
  );
};
