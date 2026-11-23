import React from "react";

export const DEFAULT_NAV_ICON_SIZE = 14;

/**
 * Nav icons are 14px unless the caller sets a size, rather than the 15px the
 * shared icons fall back to elsewhere.
 */
export const withDefaultIconSize = (icon: React.ReactNode) => {
  if (!React.isValidElement<{ size?: number }>(icon)) return icon;
  if (typeof icon.type === "string" || icon.type === React.Fragment)
    return icon;
  if (icon.props.size !== undefined) return icon;
  return React.cloneElement(icon, { size: DEFAULT_NAV_ICON_SIZE });
};
