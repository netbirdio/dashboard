import { ScrollArea, ScrollBar } from "@components/ScrollArea";
import { cn } from "@utils/helpers";
import { CheckIcon, CopyIcon } from "lucide-react";
import React from "react";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";

type Props = {
  children: React.ReactNode;
  codeToCopy?: string;
  message?: string;
  onClick?: () => void;
  className?: string;
  showCopyIcon?: boolean;
  dark?: boolean;
  small?: boolean;
};

export default function Code({
  children,
  codeToCopy,
  message = "Code has been copied to clipboard",
  onClick,
  className,
  showCopyIcon = true,
  dark = false,
  small = false,
}: Props) {
  const [wrapper, copyToClipboard, copied] = useCopyToClipboard(
    codeToCopy ? codeToCopy : undefined,
  );

  const handleCopy = () => {
    copyToClipboard(message).then(() => onClick && onClick());
  };

  return (
    <div className={"relative w-full"}>
      <div
        ref={wrapper}
        className={cn(
          "rounded-md text-sm  transition-all relative duration-300 border",
          dark
            ? "bg-gray-50 border-neutral-200 dark:border-nb-gray-800 hover:bg-gray-100 dark:hover:bg-nb-gray-900/80 dark:bg-nb-gray-930"
            : "bg-gray-50 border-default hover:bg-gray-100 dark:hover:bg-nb-gray-900/80 dark:bg-nb-gray-900",
          dark
            ? "text-gray-700 hover:text-gray-900 dark:text-nb-gray-300 dark:hover:text-nb-gray-300"
            : "text-gray-700 hover:text-gray-900 dark:text-nb-gray-200 dark:hover:text-nb-gray-200",
          "overflow-x-auto relative z-0 w-full",
          className,
        )}
      >
        <ScrollArea className={"w-full"}>
          <code
            className={cn(
              "font-light pl-3 pr-12  inline-block cursor-text w-full text-sm",
              className,
              small ? "py-[6.8px]" : "py-2.5",
            )}
          >
            {children}
          </code>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      {showCopyIcon && (
        <span
          onClick={handleCopy}
          className={"absolute right-0 top-0 pt-3 pr-3 cursor-pointer z-10"}
          data-cy="copy-to-clipboard"
        >
          {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
        </span>
      )}
    </div>
  );
}

function CodeComment({ children }: Props) {
  return (
    <pre className={"text-gray-500 dark:text-nb-gray-400 block w-full whitespace-pre"}>
      {children}
    </pre>
  );
}
Code.Comment = CodeComment;

function CodeLine({ children }: Props) {
  return <pre className={"block whitespace-pre"}>{children}</pre>;
}

Code.Line = CodeLine;
