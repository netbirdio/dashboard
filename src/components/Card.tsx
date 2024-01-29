import TextWithTooltip from "@components/ui/TextWithTooltip";
import useCopyToClipboard from "@hooks/useCopyToClipboard";
import { cn } from "@utils/helpers";
import { Copy } from "lucide-react";
import React from "react";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}
function Card({ children, className, ...props }: Props) {
  return (
    <div
      {...props}
      className={cn(
        "bg-nb-gray-940 rounded-md border border-nb-gray-900 w-1/2 overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardList({ children }: Props) {
  return <ul className={"flex flex-col h-full justify-between"}>{children}</ul>;
}

type CardListItemProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
  copy?: boolean;
};

function CardListItem({
  label,
  value,
  className,
  copy = false,
}: CardListItemProps) {
  const [, copyToClipBoard] = useCopyToClipboard(value as string);

  return (
    <li
      className={cn(
        "flex justify-between px-4 border-b border-nb-gray-900 py-4 last:border-b-0 items-center h-full",
        className,
      )}
    >
      <div className={"flex gap-2.5 items-center text-sm"}>{label}</div>
      <div
        className={cn(
          "text-right text-nb-gray-400 text-sm flex items-center gap-2",
          copy && "cursor-pointer hover:text-nb-gray-300 transition-all",
        )}
        onClick={() =>
          copy && copyToClipBoard(`${label} has been copied to clipboard.`)
        }
      >
        <TextWithTooltip text={value as string} maxChars={40} />
        {copy && <Copy size={13} />}
      </div>
    </li>
  );
}

Card.List = CardList;
Card.ListItem = CardListItem;

export default Card;
