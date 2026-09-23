"use client";

import { cn } from "@utils/helpers";
import React, { useId } from "react";
import { AIProviderId } from "@/modules/agent-network/data/mockData";
import { PROVIDER_LOGOS } from "@/modules/agent-network/data/providerLogos";
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
// Light ink for marks whose brand color would disappear against the
// dashboard's dark surfaces (Anthropic #191919, Vercel #000, OpenAI #412991).
const LIGHT_INK = "#cbd2d6";
// Share of the tile the mark itself takes up.
const MARK_SCALE = 0.42;

// relativeLuminance implements the WCAG sRGB formula. Returns 0 for anything
// that isn't a #rgb / #rrggbb string, which sends the caller to the light ink.
const relativeLuminance = (hex: string): number => {
  const value = hex.trim().replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return 0;
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

// The dashboard is dark-only, so a brand color is usable as ink only when it
// clears ~3:1 against the surfaces these marks sit on (nb-gray-800 …-950).
// Everything darker flips to a light ink rather than turning into a smudge.
const MIN_INK_LUMINANCE = 0.14;

const markColor = (brandColor: string) =>
  relativeLuminance(brandColor) < MIN_INK_LUMINANCE ? LIGHT_INK : brandColor;

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
  const ink = logo?.ink ?? markColor(brandColor);
  const Icon = logo?.icon;

  const mark = !logo ? (
    // Anything the catalog knows but this dashboard build has no mark for.
    <span
      className={cn(
        "inline-flex items-center justify-center shrink-0 font-semibold uppercase leading-none",
        !tile && className,
      )}
      style={{
        color: LIGHT_INK,
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
      className={cn("shrink-0", !tile && className)}
      style={{ color: ink }}
    />
  ) : (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      viewBox={logo.viewBox ?? "0 0 24 24"}
      width={markSize}
      height={markSize}
      className={cn("shrink-0", !tile && className)}
      style={{ color: ink }}
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
