import { IconCircleFilled } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import * as React from "react";

type Props = {
  // Sits in the card's 40x40 tile: a logo <Image>, or a 16px icon.
  icon: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  // Right end of the title row — a FeatureCardStatus pill, say.
  action?: React.ReactNode;
  // Right end of the card, centered against the icon tile rather than the
  // title, for controls that shouldn't stretch the title row.
  trailing?: React.ReactNode;
  // Given one, the card becomes a button and picks up the hover state.
  onClick?: () => void;
  className?: string;
  "aria-label"?: string;
};

export const FeatureCardStatus = ({ enabled }: { enabled: boolean }) => (
  <div
    className={cn(
      "text-xs flex gap-2 items-center font-medium shrink-0",
      enabled ? "text-green-500" : "text-nb-gray-500",
    )}
  >
    <IconCircleFilled size={8} />
    {enabled ? "Enabled" : "Disabled"}
  </div>
);

/**
 * The compact "feature" card used to summarise a capability next to a table:
 * Identity Provider Sync and MFA on the users page, Event Streaming above the
 * audit events, the API base URL on Agent Network. An icon tile, a title with
 * a status or action opposite it, and one line of detail.
 */
export default function FeatureCard({
  icon,
  title,
  description,
  action,
  trailing,
  onClick,
  className,
  "aria-label": ariaLabel,
}: Readonly<Props>) {
  const shell = cn(
    "block text-left border border-nb-gray-900/50 bg-nb-gray-900/30",
    "py-3 pl-3 pr-5 rounded-lg transition-all min-w-[310px] max-w-[440px]",
    onClick && "cursor-pointer hover:bg-nb-gray-900/50",
    className,
  );

  const body = (
    <div className={"flex items-center gap-4 w-full"}>
      <div
        className={
          "h-10 w-10 shrink-0 flex items-center justify-center rounded-md bg-nb-gray-900/70 p-2 border border-nb-gray-900/70"
        }
      >
        {icon}
      </div>
      <div className={"w-full min-w-0"}>
        <div className={"flex items-center gap-3 justify-between"}>
          <div className={"font-medium text-sm flex gap-2 items-center"}>
            {title}
          </div>
          {action}
        </div>
        <p className={"text-xs font-light !text-nb-gray-300 mt-1.5"}>
          {description}
        </p>
      </div>
      {trailing}
    </div>
  );

  if (!onClick) return <div className={shell}>{body}</div>;

  return (
    <button
      type={"button"}
      onClick={onClick}
      aria-label={ariaLabel}
      className={shell}
    >
      {body}
    </button>
  );
}
