import { randomBoolean, randomString } from "@utils/helpers";
import { useMemo } from "react";
import type { Peer } from "@/interfaces/Peer";
import type { GroupedRoute } from "@/interfaces/Route";
import type { SetupKey } from "@/interfaces/SetupKey";

export function useSetupKeyPlaceholders() {
  return useMemo(() => {
    const arr = [];
    for (let i = 0; i < 8; i++) {
      const r = randomBoolean();
      const t = randomBoolean();
      arr.push({
        key: randomString(),
        id: randomString(),
        name: randomString(),
        expires: new Date(),
        last_used: new Date(),
        revoked: r,
        state: "placeholder",
        type: t ? "reusable" : "one-off",
        used_times: 0,
        valid: !r,
        auto_groups: [],
        expires_in: 0,
        usage_limit: null,
        ephemeral: randomBoolean(),
      } as SetupKey);
    }

    return Object.freeze(arr) as SetupKey[];
  }, []);
}
export function usePeerPlaceholders() {
  return useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const os = ["Linux", "Windows", "MacOS", "Android"][
        Math.floor(Math.random() * 4)
      ];
      arr.push({
        id: randomString(),
        name: randomString(),
        ip: randomString(),
        connected: randomBoolean(),
        last_seen: new Date(),
        os: os,
        version: randomString(4, 5),
        ssh_enabled: false,
        hostname: randomString(),
        ui_version: randomString(4, 5),
        dns_label: randomString(),
        last_login: new Date(),
        login_expired: randomBoolean(),
        login_expiration_enabled: randomBoolean(),
      } as Peer);
    }

    return Object.freeze(arr) as Peer[];
  }, []);
}

export function useGroupedRoutesPlaceholders() {
  return useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      arr.push({
        id: randomString(),
        network_id: randomString(),
        network: randomString(),
        enabled: randomBoolean(),
        high_availability_count: 0,
        is_using_route_groups: randomBoolean(),
        routes: [],
      } as GroupedRoute);
    }

    return Object.freeze(arr) as GroupedRoute[];
  }, []);
}
