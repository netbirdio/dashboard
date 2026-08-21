import { Page, Locator, expect } from "@playwright/test";
import { navigateTo } from "./auth";
import { clearScrollLock, setTestEdition } from "./utils";

// The test build's billing modal backdrop swallows canvas clicks.
async function disableCloudBilling(page: Page) {
  await setTestEdition(page, "licensed");
}

export async function dismissBlockingOverlays(page: Page) {
  await clearScrollLock(page);
}

export type FlowView = "peers" | "users" | "groups" | "networks";

export async function openControlCenter(page: Page, tab?: FlowView) {
  await disableCloudBilling(page);
  await navigateTo(
    page,
    tab ? `/control-center?tab=${tab}` : "/control-center",
  );
  // The pane hides behind cc-prefit until the first fitView.
  await expect(page.locator(".react-flow__pane")).toBeVisible();
  await dismissBlockingOverlays(page);
}

export async function switchFlowView(page: Page, view: FlowView) {
  await dismissBlockingOverlays(page);
  await page.getByTestId(`cc-flow-${view}`).click({ force: true });
  await expect(page.getByTestId(`cc-flow-${view}`)).toHaveAttribute(
    "data-state",
    "active",
  );
}

export async function enterDraft(page: Page) {
  await dismissBlockingOverlays(page);
  await page.getByTestId("cc-mode-draft").click({ force: true });
  await page.getByTestId("cc-draft-use-current-option").click({ force: true });
  // Waiting for the Add button also guarantees draft mode is fully active.
  await expect(page.getByTestId("cc-toolbar-add")).toBeVisible();
}

// Draft state is React-only, so a full page load discards it.
export async function resetDraftState(page: Page) {
  await openControlCenter(page);
}

export async function readDraftChanges(page: Page): Promise<any[]> {
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
  // Intermediate moves so drag thresholds see a realistic pointer path.
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

// Networks share the Resources tab.
function categoryForTemplate(templateTestId: string): string {
  if (templateTestId.includes("peer")) return "peers";
  if (templateTestId.includes("policy")) return "policies";
  if (templateTestId.includes("group")) return "groups";
  return "resources";
}

/** The panel drags via raw pointer events, not HTML5 DnD. */
export async function dragTemplateToCanvas(
  page: Page,
  templateTestId: string,
  target?: { x: number; y: number },
  opts: { search?: string } = {},
) {
  const item = page.getByTestId(templateTestId);
  // The panel only fades out, so read the toggle's state from aria-pressed.
  const addButton = page.getByTestId("cc-toolbar-add");
  if ((await addButton.getAttribute("aria-pressed")) !== "true") {
    await addButton.click();
    await expect(addButton).toHaveAttribute("aria-pressed", "true");
  }
  // Dispatch directly: the tab's hover tooltip intercepts a real pointer click.
  await page
    .getByTestId(`cc-category-${categoryForTemplate(templateTestId)}`)
    .dispatchEvent("click");
  // Picking a category clears the search box, so fill it after the switch.
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
  // A resource drop opens an editor modal that Escape would dismiss.
  if (!templateTestId.includes("resource")) {
    await page.keyboard.press("Escape");
  }
}

export function canvasNode(page: Page, dataIdPrefix: string) {
  return page.locator(`.react-flow__node[data-id^="${dataIdPrefix}"]`);
}

/** `sr` (right) makes the node a policy SOURCE, `sl` (left) a DESTINATION. */
export async function connectNodes(
  page: Page,
  source: Locator,
  target: Locator,
  handleSide: "sr" | "sl" = "sr",
) {
  // Connect handles fade in on node hover, so wait for a stable position.
  await source.hover();
  const handle = source.locator(
    `.react-flow__handle[data-handleid="${handleSide}-connect"]`,
  );
  await expect(handle).toBeVisible();
  await page.waitForTimeout(100);
  // The target's handle only becomes connectable mid-drag, so pace and dwell.
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

export async function panePoint(page: Page, fx: number, fy: number) {
  const pane = await page.locator(".react-flow__pane").boundingBox();
  if (!pane) throw new Error("canvas pane not laid out");
  return { x: pane.x + pane.width * fx, y: pane.y + pane.height * fy };
}

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
  return await page.evaluate(
    () =>
      (window as unknown as { __ccDraftCanvas?: unknown }).__ccDraftCanvas ??
      null,
  );
}

export async function dragNodeOnto(page: Page, node: Locator, target: Locator) {
  await mouseDrag(page, await centerOf(node), await centerOf(target));
}

export async function clickContextMenuItem(
  page: Page,
  node: Locator,
  action: string,
) {
  await dismissBlockingOverlays(page);
  // The menu's items detach when the node underneath it updates, so retry.
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

/** Assumes both policy sides are already filled in. */
export async function submitCreatePolicyModal(page: Page, name?: string) {
  await page.getByTestId("policy-continue").click();
  await page.getByTestId("policy-continue").click();
  if (name) {
    await page.getByTestId("policy-name").fill(name);
  }
  await page.getByTestId("submit-policy").click();
}
