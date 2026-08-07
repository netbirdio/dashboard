import * as React from "react";

type Props = {
  size?: number;
  className?: string;
};

/**
 * A small, neutral icon for the Entra device authentication pages.
 *
 * We deliberately avoid Microsoft/Entra trademark-coloured assets: this icon
 * depicts a device with a fingerprint/shield overlay, matching the rest of
 * NetBird's internal icon set.
 */
export default function EntraDeviceIcon({
  size = 16,
  className,
}: Readonly<Props>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* laptop base */}
      <path d="M3 17h18" />
      <rect x="5" y="5" width="14" height="10" rx="1.5" />
      {/* shield/check overlay */}
      <path d="M12 7.5l3 1.2v2.4c0 2-1.3 3.1-3 3.6-1.7-.5-3-1.6-3-3.6V8.7L12 7.5z" />
      <path d="M10.8 10.8l.8.9 1.6-1.7" />
    </svg>
  );
}
