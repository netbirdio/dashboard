import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReverseProxiesProvider, {
  flattenReverseProxies,
  sanitizeTargets,
  useReverseProxies,
} from "@/contexts/ReverseProxiesProvider";
import {
  ReverseProxy,
  ReverseProxyTarget,
  ReverseProxyTargetProtocol,
  ReverseProxyTargetType,
  ServiceMode,
  TargetAccessAction,
} from "@/interfaces/ReverseProxy";

const put = vi.fn();
let targetModalProps:
  | { onSave: (target: ReverseProxyTarget) => Promise<void> }
  | undefined;

vi.mock("@components/Notification", () => ({ notify: vi.fn() }));
vi.mock("@utils/api", () => ({
  default: () => ({ data: undefined, isLoading: false }),
  useApiCall: () => ({ put: (...args: unknown[]) => put(...args) }),
}));
vi.mock("swr", () => ({ useSWRConfig: () => ({ mutate: vi.fn() }) }));
vi.mock("@/contexts/DialogProvider", () => ({
  useDialog: () => ({ confirm: vi.fn() }),
}));
vi.mock("@/contexts/PermissionsProvider", () => ({
  usePermissions: () => ({ permission: { services: { read: true } } }),
}));
vi.mock("@/cloud/reverse-proxy/TerminatedProxiesProvider", () => ({
  TerminatedProxiesProvider: () => null,
}));
vi.mock("@/modules/reverse-proxy/ReverseProxyModal", () => ({
  default: () => null,
}));
vi.mock("@/modules/reverse-proxy/targets/ReverseProxyTargetModal", () => ({
  default: (props: typeof targetModalProps) => {
    targetModalProps = props;
    return null;
  },
}));

afterEach(() => {
  cleanup();
  put.mockReset();
  targetModalProps = undefined;
});

describe("sanitizeTargets", () => {
  it("preserves target access actions while removing frontend-only fields", () => {
    const [target] = sanitizeTargets([
      {
        target_type: ReverseProxyTargetType.PEER,
        target_id: "peer-1",
        protocol: ReverseProxyTargetProtocol.HTTP,
        host: "100.64.0.1",
        port: 80,
        enabled: true,
        access_action: TargetAccessAction.BYPASS,
        destination: "http://100.64.0.1",
      },
    ]);

    expect(target.access_action).toBe(TargetAccessAction.BYPASS);
    expect(target).not.toHaveProperty("destination");
    expect(target).not.toHaveProperty("host");
  });
});

describe("handleSaveTarget", () => {
  const target: ReverseProxyTarget = {
    target_type: ReverseProxyTargetType.HOST,
    target_id: "resource-1",
    protocol: ReverseProxyTargetProtocol.HTTPS,
    port: 443,
    enabled: true,
  };
  const proxy: ReverseProxy = {
    id: "service-1",
    name: "app.example.com",
    domain: "app.example.com",
    mode: ServiceMode.HTTP,
    targets: [target],
    enabled: true,
  };

  // The network and peer pages list flattened copies of the targets, so the
  // target being edited is not the same object as the one in the service.
  it("saves an edit made from a flattened target list", async () => {
    put.mockResolvedValue({});
    const { result } = renderHook(() => useReverseProxies(), {
      wrapper: ReverseProxiesProvider,
    });
    const [flatTarget] = flattenReverseProxies({ reverseProxies: [proxy] });

    act(() => result.current.openTargetModal({ proxy, target: flatTarget }));
    await act(async () => {
      await targetModalProps?.onSave({
        ...target,
        options: { skip_tls_verify: true },
      });
    });

    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({
        targets: [
          expect.objectContaining({ options: { skip_tls_verify: true } }),
        ],
      }),
      "/service-1",
    );
  });
});
