import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./useIronRDPInputHandler", () => ({
  useIronRDPInputHandler: () => ({ isActive: false, focusCanvas: vi.fn() }),
}));

const { useRemoteDesktop, RDPStatus } = await import("./useRemoteDesktop");
const { FINGERPRINT_CALCULATION_FAILED, hostFromServerAddr } = await import(
  "./useRDPCertificateHandler"
);

const CERT_A = new Uint8Array([1, 2, 3]);
const CERT_B = new Uint8Array([4, 5, 6]);

// Stands in for the wasm bridge: every connect runs the RDCleanPath certificate
// check through window.RDPCertificateHandler, the same hook the real proxy uses,
// and fails the connection when the certificate is rejected.
// Like the Go proxy, it reports certificate metadata but no fingerprint.
const createClient = () => {
  const served: {
    cert: Uint8Array;
    fingerprint?: string;
    serverAddr?: (hostname: string, port: number) => string;
  } = { cert: CERT_A };
  let sessions = 0;

  const client = {
    initializeIronRDP: async () => true,
    client: {},
    ironRDPBridge: {
      connect: async (hostname: string, port: number) => {
        const Handler = (window as any).RDPCertificateHandler;
        const accepted = await new Handler().handleRDCleanPathResponse({
          ServerAddr: served.serverAddr
            ? served.serverAddr(hostname, port)
            : `${hostname}:${port}`,
          ServerCertChain: [served.cert],
          CertificateInfo: {
            subject: "CN=peer",
            ...(served.fingerprint && { fingerprint: served.fingerprint }),
          },
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
  remember = false,
) => {
  let connecting!: Promise<unknown>;
  act(() => {
    connecting = hook.result.current.connect(config(hostname));
  });
  await waitFor(() =>
    expect(hook.result.current.pendingCertificate).not.toBeNull(),
  );
  const { certificate } = hook.result.current.pendingCertificate!;
  act(() => hook.result.current.acceptCertificatePrompt(remember));
  await act(() => connecting);
  return certificate;
};

describe("useRemoteDesktop certificate trust", () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.RDPCertificateHandler;
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
    const first = await connectAndAccept(hook, "peer-a");

    served.cert = CERT_B;
    act(() => {
      void hook.result.current.connect(config("peer-a"));
    });

    await waitFor(() =>
      expect(hook.result.current.pendingCertificate).not.toBeNull(),
    );
    expect(
      hook.result.current.pendingCertificate?.certificate.fingerprint,
    ).not.toBe(first.fingerprint);
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

  it("prompts again after a failed fingerprint was accepted with remember", async () => {
    vi.spyOn(crypto.subtle, "digest").mockRejectedValue(
      new Error("insecure context"),
    );
    const { hook } = setup();
    await connectAndAccept(hook, "peer-a", true);

    expect(localStorage.getItem("netbird-rdp-trusted-certs")).toBeNull();

    act(() => {
      void hook.result.current.connect(config("peer-a"));
    });

    await waitFor(() =>
      expect(hook.result.current.pendingCertificate?.hostname).toBe("peer-a"),
    );
    expect(hook.result.current.status).toBe(RDPStatus.CONNECTING);
  });

  it("prompts when a failed fingerprint is already stored for the host", async () => {
    localStorage.setItem(
      "netbird-rdp-trusted-certs",
      JSON.stringify({
        "peer-a": {
          fingerprint: FINGERPRINT_CALCULATION_FAILED,
          hostname: "peer-a",
          addedAt: new Date().toISOString(),
        },
      }),
    );
    vi.spyOn(crypto.subtle, "digest").mockRejectedValue(
      new Error("insecure context"),
    );
    const { hook } = setup();

    act(() => {
      void hook.result.current.connect(config("peer-a"));
    });

    await waitFor(() =>
      expect(hook.result.current.pendingCertificate?.hostname).toBe("peer-a"),
    );
    expect(hook.result.current.status).toBe(RDPStatus.CONNECTING);
  });

  it("ignores a fingerprint reported by the proxy and hashes the certificate", async () => {
    const { hook, served } = setup();
    const accepted = await connectAndAccept(hook, "peer-a", true);

    served.cert = CERT_B;
    served.fingerprint = accepted.fingerprint;
    act(() => {
      void hook.result.current.connect(config("peer-a"));
    });

    await waitFor(() =>
      expect(hook.result.current.pendingCertificate?.isChange).toBe(true),
    );
    expect(
      hook.result.current.pendingCertificate?.certificate.fingerprint,
    ).not.toBe(accepted.fingerprint);
  });

  it("rejects a certificate reported for a different host than requested", async () => {
    const { hook, served } = setup();
    await connectAndAccept(hook, "peer-a", true);

    served.serverAddr = (_hostname, port) => `peer-a:${port}`;
    await act(() =>
      expect(hook.result.current.connect(config("peer-b"))).rejects.toThrow(
        "Certificate rejected",
      ),
    );

    expect(hook.result.current.pendingCertificate).toBeNull();
    expect(hook.result.current.status).not.toBe(RDPStatus.CONNECTED);
  });

  it("keeps trust separate for IPv6 hosts sharing a prefix", async () => {
    const { hook, served } = setup();
    served.serverAddr = (hostname, port) => `[${hostname}]:${port}`;
    await connectAndAccept(hook, "fd00::1", true);

    act(() => {
      void hook.result.current.connect(config("fd00::2"));
    });

    await waitFor(() =>
      expect(hook.result.current.pendingCertificate?.hostname).toBe("fd00::2"),
    );
    expect(
      Object.keys(
        JSON.parse(localStorage.getItem("netbird-rdp-trusted-certs")!),
      ),
    ).toEqual(["fd00::1"]);
  });

  it("shows the certificate metadata reported by the proxy in the prompt", async () => {
    const { hook } = setup();
    act(() => {
      void hook.result.current.connect(config("peer-a"));
    });

    await waitFor(() =>
      expect(hook.result.current.pendingCertificate).not.toBeNull(),
    );
    expect(hook.result.current.pendingCertificate?.certificate).toMatchObject({
      subject: "CN=peer",
      hostname: "peer-a",
    });
  });

  it("keys trust by the requested host when the proxy omits ServerAddr", async () => {
    const { hook, served } = setup();
    served.serverAddr = () => "";
    await connectAndAccept(hook, "peer-a", true);

    expect(
      Object.keys(
        JSON.parse(localStorage.getItem("netbird-rdp-trusted-certs")!),
      ),
    ).toEqual(["peer-a"]);
  });

  it("removes the certificate handler once a connect settles", async () => {
    const { hook, served } = setup();
    await connectAndAccept(hook, "peer-a");
    expect(window.RDPCertificateHandler).toBeUndefined();

    served.serverAddr = (_hostname, port) => `peer-a:${port}`;
    await act(() =>
      expect(hook.result.current.connect(config("peer-b"))).rejects.toThrow(),
    );
    expect(window.RDPCertificateHandler).toBeUndefined();
  });
});

describe("hostFromServerAddr", () => {
  it.each([
    ["peer-a:3389", "peer-a"],
    ["100.64.0.1:3389", "100.64.0.1"],
    ["[fd00::1]:3389", "fd00::1"],
    ["[fe80::1%eth0]:3389", "fe80::1%eth0"],
    ["peer-a", "peer-a"],
    ["fd00::1", "fd00::1"],
  ])("parses %s", (serverAddr, host) => {
    expect(hostFromServerAddr(serverAddr)).toBe(host);
  });
});
