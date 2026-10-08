# Working on the dashboard

Guidance for anyone, human or AI agent, changing this codebase. Folder-level
guides go deeper: `e2e/CLAUDE.md`, `.storybook/visual-regression/CLAUDE.md`,
`src/modules/control-center/CLAUDE.md`.

## Reuse before you build

Every new component is one more place to update when the design or behaviour
changes, and one more place for the two copies to drift apart. Before writing
UI code:

1. **Search first.** Look in `src/components/` (shared building blocks),
   `src/components/ui/` (small composed pieces) and the `src/modules/` of
   pages that do something similar. Most of what a page needs already exists
   somewhere: tables, filters, selectors, badges, modals, empty states.
2. **Look at how other pages solve it.** Copy the pattern, not the code: if
   the peers page and the groups page both filter a table, a third table
   should filter the same way, with the same components.
3. **Prefer, in this order:**
   1. use an existing component as it is;
   2. extend it: add a prop or a `cva` variant;
   3. extract a shared component from the places that already repeat it;
   4. only then write a new one.
4. **Extend without breaking callers.** A new prop is optional and its
   default keeps today's behaviour and look, so every existing caller renders
   exactly as before. The visual regression check proves that (see below).
5. **Don't restyle shared components at the call site.** Passing colour,
   border or background classes through `className` to override a shared
   component creates a one-off that the next design change misses. If a
   component needs a different look, give it a variant.
6. **Keep logic out of components.** Data shaping, validation and
   permission rules go in plain functions or hooks next to the module, where
   unit tests can reach them.

## Keep the tests in step

A change is done when the tests describe the new behaviour, not when the old
ones still pass. Update all three suites as part of the same change.

| Suite | Lives in | Covers | Run |
| --- | --- | --- | --- |
| Unit (Vitest) | `*.test.ts(x)` next to the code | Pure logic, hooks, small components | `npm run test:unit` |
| End-to-end (Playwright) | `e2e/tests/*.spec.ts` | User flows against a real backend | `npm run test`, see `e2e/CLAUDE.md` |
| Stories + visual regression | `*.stories.tsx` next to the component or page | How every component and page looks, including open menus and modals | `npm run test:visual` |

When you:

- **change logic** (helpers, hooks, validation, permission checks): add or
  update the unit tests next to it;
- **add or change a user flow** (create, edit, delete, navigation): add or
  update the e2e spec for that feature;
- **add a component, a variant or a prop**: add it to the component's
  stories (`src/components/<Name>.stories.tsx`);
- **add a page, tab, modal or state**: add a page story next to the route's
  `page.tsx`, with a `play` function for anything that has to be opened;
- **call a new API endpoint**: add a fixture in `.storybook/mocks/fixtures/`,
  otherwise stories render it as empty;
- **change anything visible**: run `npm run test:visual` and follow
  `.storybook/visual-regression/CLAUDE.md`. Every remaining difference must be
  intended; fix the rest before you hand the change over.

Add the story in the same PR as the component or page it covers. The check
builds every story against the baseline as well; a story that can't build
there (it imports something your branch adds) is left out of the baseline
and listed under "New stories" in the report, so reviewers see the new UI.

## Before you hand it over

- `npm run lint`, and a type check (`npx tsc --noEmit`, or `npm run build`).
- `npm run test:unit`.
- `npm run test:visual` for UI changes, with every difference intended.
- E2E specs for the flows you touched, or say plainly that you couldn't run
  them (they need the Docker environment from `npm run test:setup`).
- Folder guides (`CLAUDE.md` files) updated when the architecture or rules
  they describe changed.
