import {
  auditEvents,
  cities,
  countries,
  groups,
  identityProviders,
  invites,
  jobs,
  peers,
  setupKeys,
  tokens,
  trafficEvents,
  users,
} from "./core-data";
import { PEER } from "./ids";
import type { Handler, HandlerContext } from "./index";

const byId =
  <T extends { id?: string }>(list: T[]) =>
  (ctx: HandlerContext) => {
    const id = ctx.path.split("/")[2];
    return list.find((item) => item.id === id) ?? list[0];
  };

const paginated = (data: unknown[]) => ({
  data,
  page: 1,
  page_size: 10,
  total_pages: 1,
  total_records: data.length,
});

export const coreFixtures: Record<string, Handler> = {
  "GET /groups": groups,
  "GET /groups/:id": byId(groups),

  "GET /peers": peers,
  "GET /peers/:id": byId(peers),
  "GET /peers/:id/accessible-peers": (ctx: HandlerContext) =>
    peers.filter((p) => p.id !== ctx.path.split("/")[2]).slice(0, 7),
  "GET /peers/:id/jobs": jobs,
  "GET /peers/edr/bypassed": [{ peer_id: PEER.windows }],

  "GET /users": (ctx: HandlerContext) => {
    const service = ctx.query.get("service_user");
    if (service === null) return users;
    return users.filter((u) => u.is_service_user === (service === "true"));
  },
  "GET /users/:id": byId(users),
  "GET /users/:id/tokens": tokens,
  "GET /users/invites": invites,

  "GET /setup-keys": setupKeys,
  "GET /setup-keys/:id": byId(setupKeys),

  "GET /events/audit": auditEvents,
  "GET /events/network-traffic": paginated(trafficEvents),

  "GET /locations/countries": countries,
  "GET /locations/countries/:code/cities": cities,

  "GET /instance": { setup_required: false },
  "GET /instance/version": {
    management_current_version: "0.60.0",
    management_available_version: "0.60.0",
    dashboard_available_version: "2.20.0",
    management_update_available: false,
  },

  "GET /identity-providers": identityProviders,
};
