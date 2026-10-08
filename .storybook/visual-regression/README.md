# Visual regression (dark mode)

Catches unintended dark-mode changes from the light-mode / accessibility work by
rendering the same Storybook stories against two versions of the dashboard and
diffing screenshots of every story.

- **Baseline:** the merge-base of the current branch with `origin/main`
  (override with `BASE_REF`), checked out as a git worktree in
  `~/.cache/netbird-dashboard-regression/src/baseline`.
- **Current:** the working tree, uncommitted changes included.

No Playwright, no backend, no credentials. Stories render pages and components
with mocked data. One headless Chrome (your installed Google Chrome, driven by
`puppeteer-core`) takes the screenshots, and `reg-cli` writes the diff report.

## Run

```bash
npm run test:visual                         # build both, capture, diff, open the report
npm run test:visual -- --filter pages-core  # only stories whose id contains the text
npm run test:visual -- --theme light        # light-mode gallery of the working tree (nothing to diff)
npm run storybook                           # browse stories; toolbar switches theme and self-hosted/cloud
```

The report lands in `.storybook/visual-regression/output/report.html`, with
screenshots in `output/current`, `output/baseline` and `output/diff`.
A full run of all ~680 stories takes about 10 minutes: about a minute to
build both Storybooks, then 4–5 minutes of capture per side.
`--filter` cuts that down to seconds while you work on one area.

## In CI

`.github/workflows/visual-regression.yml` runs on every pull request. It
compares against the merge-base with the PR's target branch. A line
`visual-regression-base: main` in the PR description compares against another
branch instead. The job doesn't fail on differences: it lists them in the job
summary and uploads the full report as the `visual-regression-report`
artifact. Baseline screenshots are cached between runs with `actions/cache`.

## How it works

| Piece | Where | What it does |
| --- | --- | --- |
| Stories | `src/**/*.stories.tsx` | Colocated with what they cover: component stories next to the component (`src/components/Button.stories.tsx`), page stories next to the route's `page.tsx` (`src/app/(dashboard)/peers/Peers.stories.tsx`). Interactive states (open menus, modals, tabs) are `play` functions. |
| Story helpers | `src/storybook/*` | Shared play helpers and fixture re-exports, imported as `@/storybook/...`. |
| Login | `.storybook/mocks/react-oidc.tsx` | Aliased in place of `@axa-fr/react-oidc`: always logged in as an owner with every permission. |
| Config | `.storybook/mocks/config.ts` | Replaces the deployment `config.json` (`require()` calls rewritten by a Vite plugin in `main.ts`). The `cloud` story tag or toolbar switch selects the cloud flavour. |
| API | `.storybook/mocks/api.ts`, `.storybook/mocks/fixtures/*` | A `fetch` interceptor answers `/api/*` from fixtures, keyed `"GET /peers/:id"`. A story can override endpoints with `parameters.api`. Other origins are answered offline. |
| Capture | `scripts/capture.mjs` | Screenshots each story after render and `play`, with a frozen clock (2026-10-08 12:00 UTC) and finished animations. The `capture-hover` / `capture-focus` tags add real hover and keyboard-focus shots of the `[data-capture]` element. Lists API calls that had no fixture. |
| Pipeline | `run.sh` | Worktree + node_modules clone for the baseline, copies `.storybook`, `src/storybook` and every `*.stories.tsx` into it, builds both Storybooks in parallel, captures, diffs. |

Stories must compile against the baseline too, so they only import modules and
props that exist at the merge-base. A story for something new on the branch
breaks the baseline build.

## Writing a story

```tsx
// src/app/(dashboard)/setup-keys/SetupKeys.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { screen, userEvent, within } from "storybook/test";
import SetupKeysPage from "@/app/(dashboard)/setup-keys/page";
import DashboardLayout from "@/layouts/DashboardLayout";

const meta: Meta = {
  title: "Pages/Core/Setup Keys",
  parameters: { nextjs: { navigation: { pathname: "/setup-keys" } } },
  render: () => <DashboardLayout><SetupKeysPage /></DashboardLayout>,
};
export default meta;

export const List: StoryObj = { tags: ["capture-hover"] };
export const Empty: StoryObj = { parameters: { api: { "GET /setup-keys": [] } } };
export const CreateModal: StoryObj = {
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByRole("button", { name: /create setup key/i }));
    await screen.findByRole("dialog");
  },
};
```

See `OVERRIDES.md` for components whose colours are overridden at the usage
site. Those need page-level stories, because a component story alone won't show
the override.
