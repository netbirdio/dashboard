import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./useIronRDPInputHandler", () => ({
  useIronRDPInputHandler: () => ({ isActive: false, focusCanvas: vi.fn() }),
}));

const { useRemoteDesktop, RDPStatus } = await import("./useRemoteDesktop");

const CERT_A = "AA:AA";
const CERT_B = "BB:BB";

// Stands in for the wasm bridge: every connect runs the RDCleanPath certificate
// check through window.RDPCertificateHandler, the same hook the real proxy uses,
// and fails the connection when the certificate is rejected.
const createClient = () => {
  const served: { fingerprint: string } = { fingerprint: CERT_A };
  let sessions = 0;

  const client = {
    initializeIronRDP: async () => true,
    client: {},
    ironRDPBridge: {
      connect: async (hostname: string, port: number) => {
        const Handler = (window as any).RDPCertificateHandler;
        const accepted = await new Handler().handleRDCleanPathResponse({
          ServerAddr: `${hostname}:${port}`,
          ServerCertChain: [new Uint8Array([1, 2, 3])],
          CertificateInfo: { fingerprint: served.fingerprint, hostname },
        });
        if (!accepted) throw new Error("Certificate rejected");
        sessions += 1;
        return `session-${sessions}`;
      },
      getSession: () => ({}),
      disconnect: vi.fn(),
    },
  };

  return { client, served };
};

const config = (hostname: string) => ({
  hostname,
  port: 3389,
  username: "user",
  password: "secret",
});

const setup = () => {
  const { client, served } = createClient();
  const hook = renderHook(() => useRemoteDesktop(client));
  (hook.result.current.canvasRef as { current: HTMLCanvasElement }).current =
    document.createElement("canvas");
  return { hook, served };
};

const connectAndAccept = async (
  hook: ReturnType<typeof setup>["hook"],
  hostname: string,
) => {
  let connecting!: Promise<unknown>;
  act(() => {
    connecting = hook.result.current.connect(config(hostname));
  });
  await waitFor(() =>
    expect(hook.result.current.pendingCertificate).not.toBeNull(),
  );
  act(() => hook.result.current.acceptCertificatePrompt(false));
  await act(() => connecting);
};

describe("useRemoteDesktop certificate trust", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("reconnects to the same host and certificate without prompting again", async () => {
    const { hook } = setup();
    await connectAndAccept(hook, "peer-a");

    await act(() => hook.result.current.connect(config("peer-a")));

    expect(hook.result.current.pendingCertificate).toBeNull();
    expect(hook.result.current.status).toBe(RDPStatus.CONNECTED);
  });

  it("prompts again when the same host serves a different certificate", async () => {
    const { hook, served } = setup();
    await connectAndAccept(hook, "peer-a");

    served.fingerprint = CERT_B;
    act(() => {
      void hook.result.current.connect(config("peer-a"));
    });

    await waitFor(() =>
      expect(hook.result.current.pendingCertificate?.certificate.fingerprint).toBe(
        CERT_B,
      ),
    );
    expect(hook.result.current.status).toBe(RDPStatus.CONNECTING);
  });

  it("prompts for another host even when it serves an accepted certificate", async () => {
    const { hook } = setup();
    await connectAndAccept(hook, "peer-a");

    act(() => {
      void hook.result.current.connect(config("peer-b"));
    });

    await waitFor(() =>
      expect(hook.result.current.pendingCertificate?.hostname).toBe("peer-b"),
    );
    expect(hook.result.current.status).toBe(RDPStatus.CONNECTING);
  });
});
