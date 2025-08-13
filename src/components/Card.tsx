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
  valueToCopy?: string;
  className?: string;
  copy?: boolean;
  copyText?: string;
  tooltip?: boolean;
  extraText?: string[];
};

function CardListItem({
  label,
  value,
  valueToCopy,
  className,
  copy = false,
  copyText,
  tooltip = true,
  extraText = [],
}: CardListItemProps) {
  return (
    <li
      className={cn(
        "flex justify-between px-4 border-b border-nb-gray-900 py-4 last:border-b-0 items-center h-full",
        className,
      )}
    >
      <div className={"flex gap-2.5 items-center text-sm"}>{label}</div>
      <div className={"flex flex-col gap-2"}>
        <CardTextItem
          label={label}
          value={value}
          valueToCopy={valueToCopy}
          copy={copy}
          copyText={copyText}
          tooltip={tooltip}
        />
        {extraText?.map((extraLabel, index) => (
          <CardTextItem
            key={index}
            label={label}
            value={extraLabel}
            copy={copy}
            copyText={copyText}
            tooltip={tooltip}
          />
        ))}
      </div>
    </li>
  );
}

type CardTextItemProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  valueToCopy?: string;
  copy?: boolean;
  copyText?: string;
  tooltip?: boolean;
};

const CardTextItem = ({
  label,
  value,
  copy = false,
  valueToCopy,
  copyText,
  tooltip = true,
}: CardTextItemProps) => {
  const [, copyToClipBoard] = useCopyToClipboard(valueToCopy ?? `${value}`);
  return (
    <div
      className={cn(
        "text-right text-nb-gray-400 text-sm flex items-center gap-2",
        copy && "cursor-pointer hover:text-nb-gray-300 transition-all",
      )}
      onClick={() =>
        copy &&
        copyToClipBoard(
          `${copyText ? copyText : label} has been copied to clipboard.`,
        )
      }
    >
      {tooltip ? (
        <TextWithTooltip text={value as string} maxChars={40} />
      ) : (
        value
      )}
      {copy && <Copy size={13} className={"shrink-0"} />}
    </div>
  );
};

Card.List = CardList;
Card.ListItem = CardListItem;

export default Card;
