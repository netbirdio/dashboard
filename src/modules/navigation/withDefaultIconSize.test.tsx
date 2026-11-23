import React from "react";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_NAV_ICON_SIZE,
  withDefaultIconSize,
} from "./withDefaultIconSize";

const Icon = (_props: { size?: number }) => null;

const sizeOf = (node: React.ReactNode) =>
  React.isValidElement<{ size?: number }>(node) ? node.props.size : undefined;

describe("withDefaultIconSize", () => {
  it("gives an icon without a size the nav default", () => {
    expect(sizeOf(withDefaultIconSize(<Icon />))).toBe(DEFAULT_NAV_ICON_SIZE);
  });

  it("keeps a size the caller set", () => {
    expect(sizeOf(withDefaultIconSize(<Icon size={16} />))).toBe(16);
  });

  it("leaves Fragments and DOM elements alone", () => {
    const fragment = (
      <>
        <Icon />
      </>
    );
    const span = <span />;
    expect(withDefaultIconSize(fragment)).toBe(fragment);
    expect(withDefaultIconSize(span)).toBe(span);
  });

  it("passes through anything that isn't an element", () => {
    expect(withDefaultIconSize(null)).toBeNull();
    expect(withDefaultIconSize("icon")).toBe("icon");
  });
});
