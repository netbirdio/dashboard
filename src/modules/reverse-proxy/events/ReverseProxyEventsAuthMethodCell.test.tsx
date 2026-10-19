import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReverseProxyEvent } from "@/interfaces/ReverseProxy";
import { ReverseProxyEventsAuthMethodCell } from "@/modules/reverse-proxy/events/ReverseProxyEventsAuthMethodCell";

afterEach(cleanup);

describe("ReverseProxyEventsAuthMethodCell", () => {
  it.each([
    ["path_bypass", "Auth Bypassed"],
    ["path_block", "Path Blocked"],
  ])("labels the %s target access decision", (authMethod, label) => {
    render(
      <ReverseProxyEventsAuthMethodCell
        event={{ auth_method_used: authMethod } as ReverseProxyEvent}
      />,
    );

    expect(screen.getByText(label)).toBeTruthy();
  });
});
