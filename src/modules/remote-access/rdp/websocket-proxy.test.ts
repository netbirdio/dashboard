import { afterEach, describe, expect, it, vi } from "vitest";
import { RDCleanPathProxyWebSocket } from "./websocket-proxy";

const response = {
  ServerAddr: "peer-a:3389",
  ServerCertChain: [new Uint8Array([1, 2, 3])],
};

const createSocket = () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  return new RDCleanPathProxyWebSocket("ws://rdcleanpath.proxy.local/test");
};

describe("RDCleanPathProxyWebSocket certificate check", () => {
  afterEach(() => {
    delete window.RDPCertificateHandler;
    vi.restoreAllMocks();
  });

  it("rejects the certificate when no handler is installed", async () => {
    const socket = createSocket();

    await expect(socket.onCertificateRequest!(response)).resolves.toBe(false);
  });

  it("delegates the decision to the installed handler", async () => {
    const handleRDCleanPathResponse = vi.fn().mockResolvedValue(true);
    window.RDPCertificateHandler = class {
      handleRDCleanPathResponse = handleRDCleanPathResponse;
    };
    const socket = createSocket();

    await expect(socket.onCertificateRequest!(response)).resolves.toBe(true);
    expect(handleRDCleanPathResponse).toHaveBeenCalledWith(response);
  });

  it("rejects the certificate when the handler throws", async () => {
    window.RDPCertificateHandler = class {
      handleRDCleanPathResponse = vi.fn().mockRejectedValue(new Error("boom"));
    };
    const socket = createSocket();

    await expect(socket.onCertificateRequest!(response)).resolves.toBe(false);
  });
});
