import { expect, userEvent, waitFor } from "storybook/test";
import { click, dialog, settle } from "@/storybook/platform";

/* Helpers for the integrations page: cards are found by position in the visible
   tab panel, and setup wizards are walked step by step with placeholder input. */

const TIMEOUT = { timeout: 8000 };

export async function cards() {
  let found: HTMLElement[] = [];
  await waitFor(() => {
    const panel =
      document.querySelector("[role=tabpanel][data-state=active]") ?? document;
    found = Array.from(panel.querySelectorAll("h3")).map(
      (h3) => h3.closest(".rounded-lg") as HTMLElement,
    );
    expect(found.length).toBeGreaterThan(0);
  }, TIMEOUT);
  return found;
}

/** Opens the card's setup wizard or configuration modal (its last plain button). */
export async function openCard(index: number) {
  const card = (await cards())[index];
  const buttons = Array.from(
    card.querySelectorAll("button:not([role=switch])"),
  );
  await click(buttons[buttons.length - 1]);
  await dialog();
  await settle();
}

const SERVICE_ACCOUNT_KEY = JSON.stringify({
  type: "service_account",
  project_id: "acme-netbird",
  client_email: "netbird-sync@acme-netbird.iam.gserviceaccount.com",
  client_id: "104857600000000000000",
});

const NEXT = /^(Get Started|Continue|Next)$/;

const nextButton = (modal: HTMLElement) =>
  Array.from(modal.querySelectorAll("button")).find((b) =>
    NEXT.test(b.textContent?.trim() ?? ""),
  );

/* Steps that need input only continue once their fields hold something and,
   where the step applies the integration to peer groups, a group is picked. */
async function fillStep(modal: HTMLElement) {
  const inputs = Array.from(
    modal.querySelectorAll<HTMLInputElement>(
      "input[type=text], input:not([type]), input[type=password], input[type=url], textarea",
    ),
  ).filter(
    (input) =>
      input.value === "" &&
      !input.readOnly &&
      !input.disabled &&
      input.offsetParent,
  );
  for (const input of inputs) {
    const placeholder = input.getAttribute("placeholder") ?? "";
    await userEvent.type(
      input,
      /^https?:\/\//.test(placeholder) ? placeholder : "storybook-value",
    );
  }
  for (const file of Array.from(
    modal.querySelectorAll<HTMLInputElement>("input[type=file]"),
  )) {
    if (file.files?.length) continue;
    await userEvent.upload(
      file,
      new File([SERVICE_ACCOUNT_KEY], "service-account.json", {
        type: "application/json",
      }),
    );
    await settle();
  }
  const groups = modal.querySelector("[data-testid=group-selector-dropdown]");
  if (groups && nextButton(modal)?.disabled) {
    await click(groups);
    await waitFor(
      () => expect(document.querySelector("[cmdk-item]")).toBeTruthy(),
      TIMEOUT,
    );
    await click(document.querySelector("[cmdk-item]"));
    await userEvent.keyboard("{Escape}");
    await settle();
  }
}

/** Walks `steps` steps forward from the wizard's first screen. */
export async function walk(steps: number) {
  for (let step = 0; step < steps; step++) {
    const modal = await dialog();
    let next = nextButton(modal);
    if (!next) throw new Error(`wizard has no step ${step + 1}`);
    if (next.disabled) {
      await fillStep(modal);
      next = nextButton(modal);
    }
    if (!next || next.disabled)
      throw new Error(`wizard step ${step} cannot continue`);
    await click(next);
    await settle();
  }
  await settle(400);
}

/** Switches to the n-th tab of the open configuration modal. */
export async function modalTab(index: number) {
  const tabs = (await dialog()).querySelectorAll("[role=tab]");
  if (!tabs[index]) throw new Error(`modal has no tab ${index}`);
  await click(tabs[index]);
  await settle(400);
}
