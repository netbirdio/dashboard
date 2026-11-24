import { cleanup, render } from "@testing-library/react";
import { useEffect } from "react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ManagementFetch } from "@/modules/assistant/lib/reads";
import { useAssistantManagementFetch } from "./useAssistantManagementFetch";

const network = vi.fn();

vi.mock("@utils/config", () => ({
  default: () => ({ apiOrigin: "https://api.test" }),
}));
vi.mock("@/contexts/ApplicationProvider", () => ({
  useApplicationContext: () => ({ globalApiParams: undefined }),
}));
vi.mock("@/utils/api", () => ({
  useNetBirdFetch: () => ({ fetch: network }),
  mergeUrlParams: (url: string, params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return query ? `${url}?${query}` : url;
  },
}));

const SNAPSHOT = [{ id: "peer-from-the-page" }];
const CURRENT = [
  { id: "peer-from-the-page" },
  { id: "peer-that-joined-later" },
];

let read: ManagementFetch;
function Assistant() {
  const fetch = useAssistantManagementFetch();
  useEffect(() => {
    read = fetch;
  }, [fetch]);
  return null;
}

function App() {
  return (
    <SWRConfig value={{ provider: () => new Map([["/peers", { data: SNAPSHOT }]]) }}>
      <Assistant />
    </SWRConfig>
  );
}

beforeEach(() => {
  network.mockResolvedValue({ ok: true, json: async () => CURRENT });
});

afterEach(() => {
  cleanup();
  network.mockReset();
});

describe("a read that prefers the cache", () => {
  it("answers an unfiltered read from the cache without fetching", async () => {
    render(<App />);
    expect(await read("/api/peers", {}, { preferCache: true })).toEqual({
      ok: true,
      body: SNAPSHOT,
    });
    expect(network).not.toHaveBeenCalled();
  });

  it("goes to the network for a filtered read, which no page key matches", async () => {
    render(<App />);
    expect(
      await read("/api/peers", { name: "x" }, { preferCache: true }),
    ).toEqual({ ok: true, body: CURRENT });
    expect(network).toHaveBeenCalledWith("https://api.test/api/peers?name=x", {
      method: "GET",
    });
  });
});

describe("a read that does not prefer the cache", () => {
  it("goes to the network even when the cache holds the list", async () => {
    render(<App />);
    expect(await read("/api/peers", {})).toEqual({ ok: true, body: CURRENT });
    expect(network).toHaveBeenCalledTimes(1);
    expect(network).toHaveBeenCalledWith("https://api.test/api/peers", {
      method: "GET",
    });
  });
});
