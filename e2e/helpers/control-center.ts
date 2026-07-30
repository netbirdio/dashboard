import { Page, Locator, expect } from "@playwright/test";
import { navigateTo } from "./auth";

export const CHANGES_KEY = "netbird-control-center-draft-changes";
export const CANVAS_KEY = "netbird-control-center-draft-canvas";

export async function openControlCenter(page: Page) {
  await navigateTo(page, "/control-center");
  // The canvas hides behind cc-prefit until the first fitView; wait for the
  // pane itself so later mouse coordinates are meaningful.
  await expect(page.locator(".react-flow__pane")).toBeVisible();
}

export async function enterDraft(page: Page) {
  await page.getByTestId("cc-mode-draft").click();
  // The start dialog asks blank vs. current view — keep the current view so
  // the draft mirrors live (what the control-center suites assert against).
  await page.getByTestId("cc-draft-use-current-option").click();
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
  const raw = await page.evaluate(
    (key) => localStorage.getItem(key),
    CHANGES_KEY,
  );
  return raw ? JSON.parse(raw) : [];
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
}

/**
 * Drags a components-panel template onto the canvas. The panel uses a custom
 * pointer-based drag (not HTML5 DnD), so raw mouse events are required.
 */
export async function dragTemplateToCanvas(
  page: Page,
  templateTestId: string,
  target?: { x: number; y: number },
) {
  const item = page.getByTestId(templateTestId);
  if (!(await item.isVisible().catch(() => false))) {
    await page.getByTestId("cc-toolbar-add").click();
    await expect(item).toBeVisible();
  }
  const pane = page.locator(".react-flow__pane");
  const paneBox = await pane.boundingBox();
  if (!paneBox) throw new Error("canvas pane not laid out");
  const to = target ?? {
    // Land right of the panel, roughly canvas center.
    x: paneBox.x + paneBox.width * 0.6,
    y: paneBox.y + paneBox.height * 0.5,
  };
  await mouseDrag(page, await centerOf(item), to);
  // Close the panel so it doesn't cover nodes for the next interaction.
  await page.keyboard.press("Escape");
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
  // Connect handles fade in on node hover.
  await source.hover();
  const handle = source.locator(
    `.react-flow__handle[data-handleid="${handleSide}-connect"]`,
  );
  await expect(handle).toBeAttached();
  await mouseDrag(page, await centerOf(handle), await centerOf(target));
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
  itemText: string,
  at?: { fx: number; fy: number },
) {
  const point = await panePoint(page, at?.fx ?? 0.6, at?.fy ?? 0.5);
  await page.mouse.move(point.x, point.y);
  await page.mouse.click(point.x, point.y, { button: "right" });
  const menu = page.getByTestId("cc-canvas-context-menu");
  await expect(menu).toBeVisible();
  await menu.getByRole("button", { name: itemText }).click();
}

export async function readDraftCanvas(page: Page): Promise<any | null> {
  const raw = await page.evaluate(
    (key) => localStorage.getItem(key),
    CANVAS_KEY,
  );
  return raw ? JSON.parse(raw) : null;
}

/** Drags one canvas node onto another (e.g. a peer into a group). */
export async function dragNodeOnto(page: Page, node: Locator, target: Locator) {
  await mouseDrag(page, await centerOf(node), await centerOf(target));
}

/** Right-clicks a node and clicks the given context-menu item. */
export async function clickContextMenuItem(
  page: Page,
  node: Locator,
  itemText: string,
) {
  await node.click({ button: "right" });
  const menu = page.getByTestId("cc-node-context-menu");
  await expect(menu).toBeVisible();
  await menu.getByRole("button", { name: itemText, exact: true }).click();
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
