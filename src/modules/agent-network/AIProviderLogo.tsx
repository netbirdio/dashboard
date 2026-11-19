"use client";

import { cn } from "@utils/helpers";
import React, { type CSSProperties, useId } from "react";
import { AIProviderId } from "@/modules/agent-network/data/mockData";
import { PROVIDER_LOGOS } from "@/modules/agent-network/data/providerLogos";
import { providerLogoColors } from "@/modules/agent-network/providerLogoColors";
import { useProviderCatalog } from "@/modules/agent-network/useProviderCatalog";

type Props = {
  // Catalog provider id to badge. Undefined renders the neutral "?" badge —
  // for requests NetBird can't attribute to any provider (e.g. rejected
  // before the router picked one).
  providerId?: AIProviderId;
  size?: number;
  className?: string;
  // Centers the mark on the neutral square the networks table uses for its
  // rows, instead of letting it sit bare. `size` is then the square.
  tile?: boolean;
};

const FALLBACK_BRAND_COLOR = "#6B7280";
// Share of the tile the mark itself takes up.
const MARK_SCALE = 0.42;

export default function AIProviderLogo({
  providerId,
  size = 36,
  className,
  tile = false,
}: Readonly<Props>) {
  const { getById } = useProviderCatalog();
  const entry = providerId ? getById(providerId) : undefined;
  const brandColor = entry?.brand_color ?? FALLBACK_BRAND_COLOR;
  const logo = providerId ? PROVIDER_LOGOS[providerId] : undefined;
  // Colons are legal in an id but not in every engine's url(#…) parser.
  const gradientId = `provider-logo-${useId().replaceAll(":", "")}`;

  const markSize = tile ? Math.round(size * MARK_SCALE) : size;
  const ink = providerLogoColors(brandColor, logo?.ink);
  const markClassName = cn(
    "shrink-0 text-[var(--provider-logo-light)] dark:text-[var(--provider-logo-dark)]",
    !tile && className,
  );
  const markStyle = {
    "--provider-logo-light": ink.light,
    "--provider-logo-dark": ink.dark,
  } as CSSProperties;
  const Icon = logo?.icon;

  const mark = !logo ? (
    // Anything the catalog knows but this dashboard build has no mark for.
    <span
      className={cn(
        "inline-flex items-center justify-center shrink-0 font-semibold uppercase leading-none text-nb-gray-200",
        !tile && className,
      )}
      style={{
        fontSize: Math.floor(markSize * 0.75),
        width: markSize,
        height: markSize,
      }}
    >
      {entry ? entry.name.charAt(0) : "?"}
    </span>
  ) : Icon ? (
    <Icon
      size={markSize}
      className={markClassName}
      style={markStyle}
    />
  ) : (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      viewBox={logo.viewBox ?? "0 0 24 24"}
      width={markSize}
      height={markSize}
      className={markClassName}
      style={markStyle}
      aria-hidden={true}
    >
      {logo.gradient && (
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits={"userSpaceOnUse"}
            x1={logo.gradient.x1}
            y1={logo.gradient.y1}
            x2={logo.gradient.x2}
            y2={logo.gradient.y2}
          >
            {logo.gradient.stops.map((stop) => (
              <stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
              />
            ))}
          </linearGradient>
        </defs>
      )}
      {logo.paths?.map((d) => (
        <path
          key={d}
          d={d}
          fill={logo.gradient ? `url(#${gradientId})` : "currentColor"}
          fillRule={logo.evenOdd ? "evenodd" : undefined}
        />
      ))}
    </svg>
  );

  if (!tile) return mark;

  return (
    <div
      className={cn(
        "bg-nb-gray-800 rounded-md flex items-center justify-center shrink-0",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {mark}
    </div>
  );
}
