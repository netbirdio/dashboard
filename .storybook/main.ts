import type { StorybookConfig } from "@storybook/nextjs-vite";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* Mirrors the tsconfig `paths` so stories and components resolve
   `@/…`, `@components/…` etc. the same way Next does. Exact aliases
   such as `@/config/test` come before their wildcard parents. */
function tsconfigAliases() {
  const tsconfig = JSON.parse(
    fs.readFileSync(path.join(root, "tsconfig.json"), "utf-8"),
  );
  const paths: Record<string, string[]> = tsconfig.compilerOptions.paths;
  return Object.entries(paths)
    .sort(([a], [b]) => Number(a.endsWith("*")) - Number(b.endsWith("*")))
    .map(([key, [target]]) => {
      const find = key.replace(/\/\*$/, "");
      const replacement = path.join(root, target.replace(/\/\*$/, ""));
      return key.endsWith("*")
        ? {
            find: new RegExp(`^${find.replace(/[/@]/g, "\\$&")}/`),
            replacement: `${replacement}/`,
          }
        : {
            find: new RegExp(`^${key.replace(/[/@]/g, "\\$&")}$`),
            replacement,
          };
    });
}

/* src/utils/config.ts loads its config with CommonJS require(), which Vite
   leaves untouched, so the calls are rewritten to import the mock config. */
const mockConfigPlugin = {
  name: "netbird-mock-config",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (!id.endsWith("src/utils/config.ts")) return;
    const mock = JSON.stringify(path.join(root, ".storybook/mocks/config.ts"));
    return (
      `import __storybookConfig from ${mock};\n` +
      code.replace(
        /require\("@\/config\/(production|local|test)"\)/g,
        "__storybookConfig",
      )
    );
  },
};

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  framework: { name: "@storybook/nextjs-vite", options: {} },
  staticDirs: ["../public"],
  core: { disableTelemetry: true },
  viteFinal: async (viteConfig) => {
    viteConfig.resolve ??= {};
    const existing = viteConfig.resolve.alias ?? [];
    viteConfig.resolve.alias = [
      // The dashboard talks to an IdP and a management API; stories get a
      // logged-in stub and a config pointing at the fetch mock in mocks/api.ts.
      {
        find: /^@axa-fr\/react-oidc$/,
        replacement: path.join(root, ".storybook/mocks/react-oidc.tsx"),
      },
      ...tsconfigAliases(),
      ...(Array.isArray(existing)
        ? existing
        : Object.entries(existing).map(([find, replacement]) => ({
            find,
            replacement,
          }))),
    ];
    viteConfig.plugins = [...(viteConfig.plugins ?? []), mockConfigPlugin];
    return viteConfig;
  },
};

export default config;
