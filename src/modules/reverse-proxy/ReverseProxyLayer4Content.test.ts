import { describe, expect, it } from "vitest";
import {
  ReverseProxyPortMapping,
  ServiceMode,
} from "@/interfaces/ReverseProxy";
import { getPortMappingErrors } from "@/modules/reverse-proxy/ReverseProxyLayer4Content";

const mapping = (
  overrides: Partial<ReverseProxyPortMapping> = {},
): ReverseProxyPortMapping => ({
  protocol: ServiceMode.TCP,
  listen_port_start: 1000,
  listen_port_end: 1000,
  target_port_start: 2000,
  target_port_end: 2000,
  ...overrides,
});

describe("port mapping listener limit", () => {
  it.each([ServiceMode.TCP, ServiceMode.UDP, ServiceMode.TLS] as const)(
    "accepts exactly 512 %s listeners",
    (protocol) => {
      expect(
        getPortMappingErrors(
          [mapping({ protocol, listen_port_end: 1511, target_port_end: 2511 })],
          true,
        ),
      ).toEqual([[]]);
    },
  );

  it.each([ServiceMode.TCP, ServiceMode.UDP, ServiceMode.TLS] as const)(
    "rejects 513 %s listeners",
    (protocol) => {
      expect(
        getPortMappingErrors(
          [mapping({ protocol, listen_port_end: 1512, target_port_end: 2512 })],
          true,
        )[0],
      ).toContain(
        "A service supports at most 512 listeners across all port mappings.",
      );
    },
  );

  it("counts TCP and UDP listeners separately when they share numeric ports", () => {
    const tcp = mapping({ listen_port_end: 1255, target_port_end: 2255 });
    const udp: ReverseProxyPortMapping = { ...tcp, protocol: ServiceMode.UDP };
    expect(getPortMappingErrors([tcp, udp], true)).toEqual([[], []]);
    expect(
      getPortMappingErrors(
        [tcp, { ...udp, listen_port_end: 1256, target_port_end: 2256 }],
        true,
      ),
    ).toEqual([
      [],
      ["A service supports at most 512 listeners across all port mappings."],
    ]);
  });

  it("includes TLS mappings in the aggregate listener count", () => {
    expect(
      getPortMappingErrors(
        [
          mapping({ listen_port_end: 1511, target_port_end: 2511 }),
          mapping({ protocol: ServiceMode.TLS }),
        ],
        true,
      ),
    ).toEqual([
      [],
      ["A service supports at most 512 listeners across all port mappings."],
    ]);
  });

  it("checks explicit TLS ranges on clusters without custom TCP/UDP ports", () => {
    expect(
      getPortMappingErrors(
        [
          mapping({
            protocol: ServiceMode.TLS,
            listen_port_end: 1512,
            target_port_end: 2512,
          }),
        ],
        false,
      )[0],
    ).toContain(
      "A service supports at most 512 listeners across all port mappings.",
    );
  });

  it.each([ServiceMode.TCP, ServiceMode.UDP] as const)(
    "preserves a single auto-assigned %s listener",
    (protocol) => {
      expect(
        getPortMappingErrors(
          [mapping({ protocol, listen_port_start: 0, listen_port_end: 0 })],
          false,
        ),
      ).toEqual([[]]);
    },
  );

  it("does not let a reversed range subtract from the aggregate count", () => {
    const errors = getPortMappingErrors(
      [
        mapping({ listen_port_start: 5000, listen_port_end: 1000 }),
        mapping({ listen_port_end: 1512, target_port_end: 2512 }),
      ],
      true,
    );
    expect(errors[0]).toContain("The listener range is reversed.");
    expect(errors[1]).toContain(
      "A service supports at most 512 listeners across all port mappings.",
    );
  });
});
