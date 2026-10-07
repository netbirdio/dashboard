/**
 * Where the suite runs.
 *
 * By default it runs against the local docker environment (Zitadel, test proxy
 * clusters, docker peers) and an `APP_ENV=test` build of this checkout.
 *
 * Setting `NETBIRD_E2E_BASE_URL` points it at an already-deployed dashboard
 * instead, such as the self-hosted instance the pre-release tests bring up.
 * That dashboard is a production build behind any IdP, so the config skips
 * every test tagged with something the deployment cannot provide:
 *   - `@test-build`: needs the `netbird-test-*` hooks of an APP_ENV=test build;
 *   - `@test-env`:   needs the local docker environment;
 *   - `@cloud`:      needs a NetBird Cloud management server;
 *   - `@enterprise`: needs an Enterprise dashboard (skipped only when
 *     `NETBIRD_E2E_EDITION=community`).
 */
export type Edition = "community" | "enterprise";

export const deployedBaseURL = process.env.NETBIRD_E2E_BASE_URL || undefined;

export const isDeployedTarget = !!deployedBaseURL;

export function deployedEdition(): Edition {
  const edition = process.env.NETBIRD_E2E_EDITION || "enterprise";
  if (edition !== "community" && edition !== "enterprise") {
    throw new Error("NETBIRD_E2E_EDITION must be community or enterprise");
  }
  return edition;
}

export function deployedGrepInvert(): RegExp {
  const tags = ["@test-build", "@test-env", "@cloud"];
  if (deployedEdition() === "community") {
    tags.push("@enterprise");
  }
  return new RegExp(tags.join("|"));
}
