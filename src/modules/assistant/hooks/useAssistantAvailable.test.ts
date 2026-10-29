import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAssistantAvailable } from "@/modules/assistant/hooks/useAssistantAvailable";

const headers = async () => ({ authorization: "Bearer t" });

const answer = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body, { status }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useAssistantAvailable", () => {
  it("is available when the service says ok", async () => {
    answer(200, { ok: true });
    const { result } = renderHook(() => useAssistantAvailable("https://assistant.test", headers));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("stays hidden for an account the service has not enabled", async () => {
    const fetch = answer(200, { ok: false });
    const { result } = renderHook(() => useAssistantAvailable("https://assistant.test", headers));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await Promise.resolve();
    expect(result.current).toBe(false);
  });

  it("stays hidden when an older service refuses with a 403", async () => {
    const fetch = answer(403, { code: "account_not_allowed" });
    const { result } = renderHook(() => useAssistantAvailable("https://assistant.test", headers));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await Promise.resolve();
    expect(result.current).toBe(false);
  });

  it("asks nothing without a signed-in user", () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const { result } = renderHook(() => useAssistantAvailable("https://assistant.test", undefined));
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });
});
