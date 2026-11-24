import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VNCProxyWebSocket } from "./websocket-proxy";

type Handler = (ws: VNCProxyWebSocket) => void;

const handlerKey = (id: string) => `handleVNCWebSocket_${id}`;

describe("VNCProxyWebSocket connect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>)[handlerKey("a")];
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("attaches the handler and opens the socket", () => {
    const handler = vi.fn<Handler>();
    (window as unknown as Record<string, Handler>)[handlerKey("a")] = handler;
    const onopen = vi.fn();

    const socket = new VNCProxyWebSocket("ws://vnc.proxy.local/a");
    socket.onopen = onopen;
    vi.runAllTimers();

    expect(handler).toHaveBeenCalledWith(socket);
    expect(socket.readyState).toBe(VNCProxyWebSocket.OPEN);
    expect(onopen).toHaveBeenCalledTimes(1);
  });

  it("does not attach the handler when closed before it runs", () => {
    const handler = vi.fn<Handler>();
    (window as unknown as Record<string, Handler>)[handlerKey("a")] = handler;
    const onopen = vi.fn();

    const socket = new VNCProxyWebSocket("ws://vnc.proxy.local/a");
    socket.onopen = onopen;
    socket.close();
    vi.runAllTimers();

    expect(handler).not.toHaveBeenCalled();
    expect(onopen).not.toHaveBeenCalled();
    expect(socket.readyState).toBe(VNCProxyWebSocket.CLOSED);
  });
});
