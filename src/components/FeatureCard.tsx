import { IconCircleFilled } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import * as React from "react";

type Props = {
  // "default" leads with the icon tile and a title in the reading size, for a
  // card summarising a capability. "plain" drops the tile and shrinks the
  // title to a label, so the detail line under it — a URL, say — is what the
  // eye lands on. "option" is one choice in a grid of them: the bare icon
  // centered above a title in regular weight, and nothing else.
  variant?: "default" | "plain" | "option";
  // Sits in the card's 40x40 tile: a logo <Image>, or a 16px icon. The
  // option variant shows it without the tile, and the plain one not at all.
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  // Right end of the title row — a FeatureCardStatus pill, say.
  action?: React.ReactNode;
  // Right end of the card, centered against the icon tile rather than the
  // title, for controls that shouldn't stretch the title row.
  trailing?: React.ReactNode;
  // Given one, the card becomes a button and picks up the hover state.
  onClick?: () => void;
  // Given one, the card becomes a link that opens in a new tab.
  href?: string;
  // Greys out a clickable card and stops it from being clicked or followed.
  disabled?: boolean;
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
  variant = "default",
  icon,
  title,
  description,
  action,
  trailing,
  onClick,
  href,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: Readonly<Props>) {
  const plain = variant === "plain";
  const option = variant === "option";

  const interactive = !!onClick || !!href;

  const shell = cn(
    "block border bg-nb-gray-900/30 rounded-lg transition-all",
    plain ? "border-nb-gray-800" : "border-nb-gray-900",
    option
      ? "w-full px-1.5 pt-6 pb-[1.125rem] text-center"
      : cn(
          "text-left py-3 pr-5 min-w-[310px] max-w-[440px]",
          plain ? "pl-4" : "pl-3",
        ),
    interactive && !disabled && "cursor-pointer hover:bg-nb-gray-900/50",
    interactive && disabled && "opacity-35 cursor-not-allowed",
    className,
  );

  const iconTile = (
    <div
      className={
        "h-10 w-10 shrink-0 flex items-center justify-center rounded-md bg-nb-gray-900/70 p-2 border border-nb-gray-900/70"
      }
    >
      {icon}
    </div>
  );

  const body = option ? (
    <div className={"flex flex-col items-center gap-2 w-full"}>
      {icon}
      <div className={"text-[0.8125rem] max-w-full truncate"}>{title}</div>
    </div>
  ) : (
    <div className={"flex items-center gap-4 w-full"}>
      {!plain && iconTile}
      <div className={"w-full min-w-0"}>
        <div className={"flex items-center gap-3 justify-between"}>
          <div
            className={cn(
              "flex gap-2 items-center",
              plain
                ? "text-[10px] uppercase tracking-wider text-nb-gray-400 font-medium"
                : "font-medium text-sm",
            )}
          >
            {title}
          </div>
          {action}
        </div>
        {description && (
          <p
            className={cn(
              "text-xs",
              plain
                ? "!text-nb-gray-100 leading-tight mt-1"
                : "font-light !text-nb-gray-300 mt-1.5",
            )}
          >
            {description}
          </p>
        )}
      </div>
      {trailing}
    </div>
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        target={"_blank"}
        rel={"noopener noreferrer"}
        aria-label={ariaLabel}
        className={shell}
      >
        {body}
      </a>
    );
  }

  if (!onClick) {
    return (
      <div className={shell} aria-disabled={interactive ? true : undefined}>
        {body}
      </div>
    );
  }

  return (
    <button
      type={"button"}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={shell}
    >
      {body}
    </button>
  );
}
