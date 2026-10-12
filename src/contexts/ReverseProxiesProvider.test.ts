import { describe, expect, it } from "vitest";
import { sanitizeTargets } from "@/contexts/ReverseProxiesProvider";
import {
  ReverseProxyTargetProtocol,
  ReverseProxyTargetType,
  TargetAccessAction,
} from "@/interfaces/ReverseProxy";

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
