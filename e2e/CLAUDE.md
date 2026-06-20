# Playwright E2E Testing Guide

Complete reference for writing, running, and debugging Playwright E2E tests in the NetBird Dashboard.

## Philosophy

Tests simulate real user behavior: navigate via sidebar, click buttons, type into inputs, verify outcomes on screen. Use `{ force: true }` for Radix modal pointer-events issues.

## Setup & Running

```bash
npm run test:setup  # Create docker-based test environment with Zitadel
npm run test:dev    # Start app in test mode on http://localhost:1337
npm run test        # Run all e2e tests headless
npm run test:ui     # Open Playwright interactive UI
npx playwright test --config=e2e/playwright.config.ts tests/networks.spec.ts  # Single spec
npm run test:clean  # Tear down test environment
```

Config: `e2e/playwright.config.ts` (baseURL: `http://localhost:1337`). Auth: `e2e/playwright.env.json` (gitignored).

### Config Details

- `fullyParallel: false` — tests run sequentially within each spec
- Workers: 2 in CI, 4 locally
- Retries: 1
- Viewport: 1920x1080
- Timeouts: action 10s, navigation 15s
- On failure: screenshot, trace, video retained

## File Structure

```
e2e/
  playwright.config.ts
  helpers/
    fixtures.ts             # dashboardAsOwner / dashboardAsUser fixtures
    auth.ts                 # loginToApp(), navigateTo()
    navigation.ts           # visitByNavigation()
    utils.ts                # generateRandomName(), clearScrollLock()
    api.ts                  # Direct REST API helpers (list/delete for all entities)
    reverse-proxy-l4.ts     # Shared L4 reverse proxy helpers
  fixtures/auth/            # Generated storageState files (gitignored)
  environment/              # Docker compose, setup/teardown scripts
  tests/
    login.spec.ts           # Auth setup (login both users, save storageState)
    *.spec.ts               # Test specs
```

## Architecture

Auth is handled by `login.spec.ts`, which runs as a separate Playwright project (`"login"`) that all other tests depend on via `dependencies: ["login"]` in the config. It logs in both users and saves Zitadel session cookies to `fixtures/auth/`. If auth files already exist, login is skipped. Each test file that modifies shared state (e.g., user roles) must restore it before finishing.

## Authentication

Two test users authenticated via the `login` project, saved as `storageState`:

| User | File | Role | Usage |
|------|------|------|-------|
| owner | `fixtures/auth/owner.json` | Owner | Default for all tests |
| user | `fixtures/auth/user.json` | User (changeable) | Role-based testing |

### Custom Fixtures (`helpers/fixtures.ts`)

Tests use custom fixtures instead of raw `page`:

```typescript
import { test, expect } from "../helpers/fixtures";

test("example", async ({ dashboardAsOwner: page }) => {
  // Pre-authenticated as owner, reused across worker
});

test("multi-user", async ({ dashboardAsUser: page }) => {
  // Pre-authenticated as user
});
```

- `dashboardAsOwner` — Pre-authenticated Page for the owner user (worker-scoped, reused across tests)
- `dashboardAsUser` — Pre-authenticated Page for the user user (worker-scoped)

For multi-context scenarios (e.g., approval/billing tests), create a new browser context directly:

```typescript
const context = await browser.newContext({ storageState: "e2e/fixtures/auth/user.json" });
const page = await context.newPage();
```

## Helpers Reference

### `auth.ts`
- **`loginToApp(page, user?)`** — Full Zitadel OIDC login flow. Handles app ready, setup modal, approval pending, onboarding, account selection, and login form states.
- **`navigateTo(page, path)`** — `page.goto(path)` + dismisses setup modal if present + clears scroll-lock.

### `navigation.ts`
- **`visitByNavigation(page, navText)`** — Clicks sidebar items by exact text via `left-navigation-item` testid.

### `utils.ts`
- **`generateRandomName(prefix?)`** — Returns `prefix` + 7 random alphanumeric chars.
- **`clearScrollLock(page)`** — Removes Radix artifacts: `data-scroll-locked`, `pointer-events: none`, stale overlay divs.

### `api.ts`
Direct REST API helpers that extract Bearer tokens from intercepted responses. Used for cleanup (deleting test artifacts by prefix). Covers: groups, networks, policies, routes, setup keys, DNS zones, nameserver groups, notification channels, reverse proxy services, users.

Pattern: `listX(page)` / `deleteXById(page, id)` / `deleteXByPrefix(page, prefix)`

### `reverse-proxy-l4.ts`
Shared helpers for TCP/TLS/UDP reverse proxy service tests:
- **`createNetwork(page)`** — Creates network, returns name
- **`addResource(page, networkName, address)`** — Adds resource to a network
- **`selectL4Resource(page, resourceName)`** — Selects resource in L4 target dropdown
- **`addAccessControlRules(page)`** / **`removeAllAccessControlRules(page)`** — Manages standard test rules
- **`resetServiceFilters(page)`** — Clicks "Reset Filters & Search" button if visible
- **`openServiceEdit(page, subdomain)`** — Navigates to services, resets filters, opens edit modal
- **`deleteService(page, subdomain)`** — Deletes service via action dropdown
- **`saveServiceEdit(page)`** — Saves with "No Protection" confirmation handling
- **`deleteNetwork(page, networkName)`** — Navigates to networks and deletes by name

## Writing Tests

### Standard Structure

```typescript
import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";

test.describe.serial("Feature Name", () => {
  test("Should create an item", async ({ dashboardAsOwner: page }) => {
    await navigateTo(page, "/feature-page");
    const name = generateRandomName("prefix-");
    // ... create item
  });

  test("Should delete the item", async ({ dashboardAsOwner: page }) => {
    // ... cleanup
  });
});
```

### Key Patterns

**Selectors** — Always use `data-testid` via `page.getByTestId()`:
```typescript
page.getByTestId("group-name-input")          // [data-testid="group-name-input"]
page.getByTestId("confirmation.confirm")       // Confirmation dialogs
```

**Text matching:**
```typescript
page.getByText("Some text")
page.locator("tr").filter({ hasText: name })
```

**Assertions:**
```typescript
await expect(locator).toBeVisible()
await expect(locator).not.toBeVisible()
await expect(locator).toHaveAttribute("data-state", "checked")
await expect(locator).toContainText("text")
```

**Form inputs:**
```typescript
await input.fill("text")                       // Clears and types
await input.press("Enter")
await input.press("Escape")
```

**Radix modal workaround:**
```typescript
await button.click({ force: true });           // Force click, bypasses pointer-events checks
```

**Waiting for API responses:**
```typescript
const responsePromise = page.waitForResponse(
  resp => resp.url().includes("/api/...") && resp.request().method() === "POST",
  { timeout: 30_000 },
);
await page.getByTestId("submit").click();
const response = await responsePromise;
expect([200, 201]).toContain(response.status());
```

**Cleanup with API helpers:**
```typescript
import { deleteGroupsByPrefix, deleteServicesByPrefix } from "../helpers/api";

// At the start of a test or in cleanup
await deleteServicesByPrefix(page, "my-prefix-");
await deleteGroupsByPrefix(page, "my-prefix-");
```

### Sidebar Navigation

```typescript
await visitByNavigation(page, "Access Control");  // Expand parent
await visitByNavigation(page, "Policies");         // Click child
```

| Parent | Children |
|--------|----------|
| Access Control | Policies, Groups, Posture Checks |
| Team | Users, Service Users |
| DNS | Nameservers, Zones, DNS Settings |
| Reverse Proxy | Custom Domains, Services |

## Test Coverage

| Area | Spec Files | Tag |
|------|-----------|-----|
| Access Control | `access-control.spec.ts`, `access-control-groups.spec.ts` | `@access-control` |
| DNS | `dns-zones.spec.ts`, `dns-nameservers.spec.ts`, `dns-settings.spec.ts` | `@dns` |
| Networks | `networks.spec.ts`, `network-routes.spec.ts` | `@network` |
| Reverse Proxy | `reverse-proxy-services-https.spec.ts`, `reverse-proxy-services-tcp.spec.ts`, `reverse-proxy-services-tls.spec.ts`, `reverse-proxy-services-udp.spec.ts`, `reverse-proxy-custom-domains.spec.ts` | `@reverse-proxy` |
| Settings | `settings-authentication.spec.ts`, `settings-clients.spec.ts`, `settings-groups.spec.ts`, `settings-networks.spec.ts`, `settings-permissions.spec.ts` | `@settings` |
| Notifications | `settings-notifications-email.spec.ts`, `settings-notifications-slack.spec.ts`, `settings-notifications-webhook.spec.ts` | `@notifications` |
| Team | `team-users.spec.ts`, `team-service-users.spec.ts`, `team-users-approval-and-billing.spec.ts` | `@team` |
| Setup Keys | `setup-keys.spec.ts` | `@setup-keys` |

## Debugging

1. `e2e/test-results/` — traces and screenshots on failure
2. `npx playwright show-report` — open the HTML report
3. `npm run test:ui` — interactive mode with step-by-step execution
4. `npx playwright test --config=e2e/playwright.config.ts --debug tests/<file>` — debugger mode

## `data-testid` Conventions

- Use `data-testid` selectors throughout. Add new ones to React components as needed.
- Kebab-case naming: `feature-field-input`, `action-feature`, `feature-actions`.
- Always use `data-testid` — both on native HTML elements and custom components. Custom components declare `"data-testid"?: string` in their props interface and place it on the appropriate internal DOM element.
