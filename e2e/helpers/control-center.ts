import { Page, Locator, expect } from "@playwright/test";
import { navigateTo } from "./auth";
import { clearScrollLock, setTestEdition } from "./utils";

// The test build treats the account as cloud (isNetBirdCloud → true when
// APP_ENV=test), which mounts BillingProvider and its trial/limits modals — a
// full-screen backdrop that intercepts canvas clicks. Control-center isn't
// billing-gated, so force a non-cloud edition via the app's own e2e override
// (netbird-test-edition localStorage) to suppress billing entirely. Set on
// every open, not once per page: the owner page is shared across specs, so
// another spec may have switched the edition in between.
async function disableCloudBilling(page: Page) {
  await setTestEdition(page, "licensed");
}

/**
 * Belt-and-suspenders for any residual full-screen backdrop (e.g. an overlay
 * that mounted before the edition override took effect): strip it + the body
 * scroll-lock so a canvas click isn't swallowed.
 */
export async function dismissBlockingOverlays(page: Page) {
  await clearScrollLock(page);
}

export const CHANGES_KEY = "netbird-control-center-draft-changes";
export const CANVAS_KEY = "netbird-control-center-draft-canvas";

export type FlowView = "peers" | "users" | "groups" | "networks";

export async function openControlCenter(page: Page, tab?: FlowView) {
  // Suppress the cloud billing modal before the page loads (see above).
  await disableCloudBilling(page);
  // The live view honours a ?tab= query param for its initial FlowView, so we
  // can deep-link straight to networks/groups/etc. instead of clicking a tab.
  await navigateTo(
    page,
    tab ? `/control-center?tab=${tab}` : "/control-center",
  );
  // The canvas hides behind cc-prefit until the first fitView; wait for the
  // pane itself so later mouse coordinates are meaningful.
  await expect(page.locator(".react-flow__pane")).toBeVisible();
  // A billing modal may already be sitting over the canvas — clear it so the
  // first interaction isn't blocked.
  await dismissBlockingOverlays(page);
}

/** Clicks a FlowSelector tab (live-mode view switcher). */
export async function switchFlowView(page: Page, view: FlowView) {
  // Clear any billing/trial modal backdrop first; force the click so a modal
  // that pops between clearing and clicking can't intercept it either.
  await dismissBlockingOverlays(page);
  await page.getByTestId(`cc-flow-${view}`).click({ force: true });
  await expect(page.getByTestId(`cc-flow-${view}`)).toHaveAttribute(
    "data-state",
    "active",
  );
}

export async function enterDraft(page: Page) {
  // A billing/trial modal backdrop can sit over the switcher — clear it and
  // force the clicks so it can't swallow them.
  await dismissBlockingOverlays(page);
  await page.getByTestId("cc-mode-draft").click({ force: true });
  // The start dialog asks blank vs. current view — keep the current view so
  // the draft mirrors live (what the control-center suites assert against).
  await page.getByTestId("cc-draft-use-current-option").click({ force: true });
  // The toolbar slides in with a spring animation — waiting for the Add
  // button also guarantees draft mode is fully active.
  await expect(page.getByTestId("cc-toolbar-add")).toBeVisible();
}

export async function exitDraftDiscarding(page: Page) {
  // The Live tab is hidden — Cancel is the way back to live.
  const cancel = page.getByTestId("cc-draft-cancel");
  if (!(await cancel.isVisible().catch(() => false))) return;
  await cancel.click();
  const confirm = page.getByTestId("confirmation.confirm");
  if (await confirm.isVisible({ timeout: 1000 }).catch(() => false)) {
    await confirm.click();
  }
  await expect(page.getByTestId("cc-toolbar-add")).not.toBeVisible();
}

/** Clears draft localStorage and makes sure we're on a clean live canvas. */
export async function resetDraftState(page: Page) {
  await openControlCenter(page);
  await page.evaluate(
    ([changes, canvas]) => {
      localStorage.removeItem(changes);
      localStorage.removeItem(canvas);
    },
    [CHANGES_KEY, CANVAS_KEY],
  );
  await exitDraftDiscarding(page);
}

export async function readDraftChanges(page: Page): Promise<any[]> {
  // Draft state is React-only (not persisted); the app mirrors the live
  // changeset onto window.__ccDraftChanges in the test build.
  return await page.evaluate(
    () =>
      (window as unknown as { __ccDraftChanges?: any[] }).__ccDraftChanges ??
      [],
  );
}

async function centerOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("element has no layout");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function mouseDrag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  // Intermediate moves so drag thresholds and drop-target detection see a
  // realistic pointer path.
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * i) / steps,
      from.y + ((to.y - from.y) * i) / steps,
    );
  }
  await page.mouse.up();
  // Let the drop handler commit the new node before callers assert on it.
  await page.waitForTimeout(120);
}

/**
 * Drags a components-panel template onto the canvas. The panel uses a custom
 * pointer-based drag (not HTML5 DnD), so raw mouse events are required.
 */
// The components panel groups its create-templates under category tabs and
// opens on "peers", so a group/resource/network template isn't on screen until
// its tab is selected. Networks share the Resources tab.
function categoryForTemplate(templateTestId: string): string {
  if (templateTestId.includes("peer")) return "peers";
  if (templateTestId.includes("policy")) return "policies";
  if (templateTestId.includes("group")) return "groups";
  return "resources";
}

export async function dragTemplateToCanvas(
  page: Page,
  templateTestId: string,
  target?: { x: number; y: number },
  opts: { search?: string } = {},
) {
  const item = page.getByTestId(templateTestId);
  // Open the panel if it's closed. The panel only fades out (staying in the
  // DOM), so element visibility is unreliable — read the toggle's real state
  // from aria-pressed instead.
  const addButton = page.getByTestId("cc-toolbar-add");
  if ((await addButton.getAttribute("aria-pressed")) !== "true") {
    await addButton.click();
    await expect(addButton).toHaveAttribute("aria-pressed", "true");
  }
  // Templates are grouped under category tabs and the panel opens on "peers";
  // switch to the tab holding this template. Dispatch the click directly — the
  // tab's hover tooltip intercepts a real pointer click and the category never
  // changes.
  await page
    .getByTestId(`cc-category-${categoryForTemplate(templateTestId)}`)
    .dispatchEvent("click");
  // Picking a category clears the search box, so narrowing the (virtualized)
  // list to an existing entity has to happen after the switch — otherwise its
  // row may never be mounted, or sit below the fold where a drag can't start.
  if (opts.search) {
    await page.getByPlaceholder(/Search components/).fill(opts.search);
  }
  await expect(item).toBeVisible();
  await item.scrollIntoViewIfNeeded();
  const pane = page.locator(".react-flow__pane");
  const paneBox = await pane.boundingBox();
  if (!paneBox) throw new Error("canvas pane not laid out");
  const to = target ?? {
    // Land right of the panel, roughly canvas center.
    x: paneBox.x + paneBox.width * 0.6,
    y: paneBox.y + paneBox.height * 0.5,
  };
  await mouseDrag(page, await centerOf(item), to);
  // A resource drop opens the editor modal (the caller fills + submits it) and
  // closes the panel itself — pressing Escape here would dismiss that editor.
  // Every other template places its node directly, so dismiss the panel.
  if (!templateTestId.includes("resource")) {
    await page.keyboard.press("Escape");
  }
}

export function canvasNode(page: Page, dataIdPrefix: string) {
  return page.locator(`.react-flow__node[data-id^="${dataIdPrefix}"]`);
}

/**
 * Connects two canvas nodes by dragging from a connect handle onto the target
 * node (FullAreaTargetHandle spans the whole node). Handle side matters:
 * dragging from `sr` (right) puts the source node on a policy's SOURCE side,
 * from `sl` (left) on the DESTINATION side. Resources only have `sl`.
 */
export async function connectNodes(
  page: Page,
  source: Locator,
  target: Locator,
  handleSide: "sr" | "sl" = "sr",
) {
  // Connect handles fade in on node hover — wait for it to be on screen (not
  // just attached) so the drag starts from a stable position.
  await source.hover();
  const handle = source.locator(
    `.react-flow__handle[data-handleid="${handleSide}-connect"]`,
  );
  await expect(handle).toBeVisible();
  await page.waitForTimeout(100);
  // React Flow's connection is a pointer drag distinct from the panel's custom
  // drag: it tracks the connection line across pointermoves and the target's
  // full-area handle only becomes connectable mid-drag, so pace the path and
  // dwell on the target before releasing.
  const from = await centerOf(handle);
  const to = await centerOf(target);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.waitForTimeout(50);
  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * i) / steps,
      from.y + ((to.y - from.y) * i) / steps,
    );
    await page.waitForTimeout(12);
  }
  await page.mouse.move(to.x, to.y);
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.waitForTimeout(120);
}

/** Positions relative to the canvas pane (fractions of width/height). */
export async function panePoint(page: Page, fx: number, fy: number) {
  const pane = await page.locator(".react-flow__pane").boundingBox();
  if (!pane) throw new Error("canvas pane not laid out");
  return { x: pane.x + pane.width * fx, y: pane.y + pane.height * fy };
}

/** Right-clicks empty canvas and clicks a creation item ("New Group", …). */
export async function createViaCanvasMenu(
  page: Page,
  action: string,
  at?: { fx: number; fy: number },
) {
  const point = await panePoint(page, at?.fx ?? 0.6, at?.fy ?? 0.5);
  await page.mouse.move(point.x, point.y);
  await page.mouse.click(point.x, point.y, { button: "right" });
  const menu = page.getByTestId("cc-canvas-context-menu");
  await expect(menu).toBeVisible();
  await menu.getByTestId(`cc-canvas-menu-${action}`).click();
}

export async function readDraftCanvas(page: Page): Promise<any | null> {
  // Draft state is React-only (not persisted); the app mirrors the canvas onto
  // window.__ccDraftCanvas in the test build.
  return await page.evaluate(
    () =>
      (window as unknown as { __ccDraftCanvas?: unknown }).__ccDraftCanvas ??
      null,
  );
}

/** Drags one canvas node onto another (e.g. a peer into a group). */
export async function dragNodeOnto(page: Page, node: Locator, target: Locator) {
  await mouseDrag(page, await centerOf(node), await centerOf(target));
}

/**
 * Right-clicks a node and clicks the given context-menu action, identified by
 * its `cc-menu-<action>` test id (e.g. "view-details", "remove", "delete").
 */
export async function clickContextMenuItem(
  page: Page,
  node: Locator,
  action: string,
) {
  await dismissBlockingOverlays(page);
  // The menu can re-render (and its items detach) when the node underneath it
  // updates, so retry the whole open + click until it lands.
  await expect(async () => {
    await node.click({ button: "right" });
    const menu = page.getByTestId("cc-node-context-menu");
    await expect(menu).toBeVisible({ timeout: 2000 });
    await menu.getByTestId(`cc-menu-${action}`).click({ timeout: 2000 });
  }).toPass();
}

export function reviewButton(page: Page) {
  return page.getByTestId("cc-draft-review");
}

export async function expectChangeCount(page: Page, count: number) {
  if (count === 0) {
    await expect(reviewButton(page)).toBeDisabled();
  } else {
    await expect(reviewButton(page)).toBeEnabled();
    await expect(reviewButton(page)).toContainText(String(count));
  }
}

/**
 * Walks the create-policy modal wizard (policy → posture checks → general)
 * and submits. Assumes both sides are already filled in.
 */
export async function submitCreatePolicyModal(page: Page, name?: string) {
  await page.getByTestId("policy-continue").click();
  await page.getByTestId("policy-continue").click();
  if (name) {
    await page.getByTestId("policy-name").fill(name);
  }
  await page.getByTestId("submit-policy").click();
}
