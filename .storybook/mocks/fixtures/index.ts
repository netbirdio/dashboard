import { account } from "./account";
import { coreFixtures } from "./core";
import { networkFixtures } from "./network";
import { platformFixtures } from "./platform";
import { currentUser } from "./users";

export type HandlerContext = {
  path: string;
  query: URLSearchParams;
  body?: unknown;
};
export type Handler = unknown | ((ctx: HandlerContext) => unknown);

/* Keyed by "METHOD /path" with `:param` for one segment; paths omit the /api prefix. */
export const fixtures: Record<string, Handler> = {
  "GET /users/current": currentUser,
  "GET /accounts": [account],
  "GET /accounts/:id": account,
  ...coreFixtures,
  ...networkFixtures,
  ...platformFixtures,
};
