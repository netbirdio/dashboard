import { fixtures, type Handler } from "./fixtures";

export const API_ORIGIN = "https://api.storybook.test";

type Compiled = { method: string; regex: RegExp; handler: Handler };

/* Keys look like "GET /peers/:id"; `:name` matches one path segment and
   exact paths win over parameterised ones (`/users/current` over `/users/:id`). */
function compile(map: Record<string, Handler>): Compiled[] {
  return Object.entries(map)
    .map(([key, handler]) => {
      const [method, path] = key.split(" ");
      const pattern = path
        .split("/")
        .map((part) =>
          part.startsWith(":")
            ? "[^/]+"
            : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        )
        .join("/");
      return { method, regex: new RegExp(`^${pattern}/?$`), handler };
    })
    .sort(
      (a, b) =>
        a.regex.source.split("[^/]+").length -
        b.regex.source.split("[^/]+").length,
    );
}

const defaults = compile(fixtures);
let overrides: Compiled[] = [];
export const unmocked = new Set<string>();

/** Per-story answers from `parameters.api`, checked before the defaults. */
export function setApiOverrides(map: Record<string, Handler> = {}) {
  overrides = compile(map);
}

const originalFetch = window.fetch.bind(window);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/* Third-party calls the dashboard makes on its own; answered offline so
   screenshots never depend on what GitHub serves today. */
const external: Record<string, unknown> = {
  "https://raw.githubusercontent.com/netbirdio/dashboard/main/announcements.json":
    [],
  "https://api.github.com/repos/netbirdio/netbird/releases/latest": {
    tag_name: "v0.60.0",
    name: "v0.60.0",
  },
};

/* Answers the dashboard's API calls from fixtures and keeps everything
   else offline except Storybook's own files. Unknown API GETs get an
   empty list and are logged, so missing fixtures are easy to spot. */
window.fetch = async (input, init) => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.href
      : input.url,
    location.href,
  );
  if (url.origin === location.origin) return originalFetch(input, init);
  if (url.origin !== API_ORIGIN) {
    const known = external[`${url.origin}${url.pathname}`];
    return known === undefined ? json({}, 404) : json(known);
  }

  const method = (init?.method ?? "GET").toUpperCase();
  const path = url.pathname.replace(/^\/api/, "");
  const match = [...overrides, ...defaults].find(
    (c) => c.method === method && c.regex.test(path),
  );
  if (!match) {
    unmocked.add(`${method} ${path}`);
    console.warn(`[storybook api] unmocked ${method} ${path}`);
  }
  const handler = match?.handler ?? (method === "GET" ? [] : {});
  const body =
    typeof handler === "function"
      ? handler({
          path,
          query: url.searchParams,
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
        })
      : handler;
  return json(body ?? {});
};
