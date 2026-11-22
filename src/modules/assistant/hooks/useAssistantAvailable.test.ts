import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ACCESS_RETRY_DELAYS_MS, useAssistantAvailable } from "@/modules/assistant/hooks/useAssistantAvailable";

const headers = async () => ({ authorization: "Bearer t" });

const answer = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body, { status }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
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

  it("asks again after a failure the service did not mean", async () => {
    vi.useFakeTimers();
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(Response.json({ code: "unauthorized" }, { status: 401 }))
      .mockResolvedValue(Response.json({ ok: true }));
    const { result } = renderHook(() => useAssistantAvailable("https://assistant.test", headers));

    await act(() => vi.advanceTimersByTimeAsync(ACCESS_RETRY_DELAYS_MS[0]));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.current).toBe(false);

    await act(() => vi.advanceTimersByTimeAsync(ACCESS_RETRY_DELAYS_MS[1]));
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result.current).toBe(true);

    await act(() => vi.advanceTimersByTimeAsync(10 * 60_000));
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("takes a 200 with ok: false as the answer and does not ask again", async () => {
    vi.useFakeTimers();
    const fetch = answer(200, { ok: false });
    const { result } = renderHook(() => useAssistantAvailable("https://assistant.test", headers));

    await act(() => vi.advanceTimersByTimeAsync(10 * 60_000));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(false);
  });

  it("stops asking once unmounted", async () => {
    vi.useFakeTimers();
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    const { unmount } = renderHook(() => useAssistantAvailable("https://assistant.test", headers));

    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(fetch).toHaveBeenCalledTimes(1);
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(10 * 60_000));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("asks nothing without a signed-in user", () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const { result } = renderHook(() => useAssistantAvailable("https://assistant.test", undefined));
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });
});
