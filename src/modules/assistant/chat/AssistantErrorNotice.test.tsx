import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AssistantErrorNotice } from "@/modules/assistant/chat/AssistantErrorNotice";

/*
  The failure this component exists for is silence.

  The SDK has always recorded `step.failed` and `turn.failed` — eve's own client
  store drops them — so a turn that died on a provider outage, an exhausted
  quota or a billing problem produced an `error` value that nothing rendered.
  To the user that is indistinguishable from the assistant deciding it had
  nothing to say, and the reason sits in a server log they cannot read.
*/

afterEach(cleanup);

describe("AssistantErrorNotice", () => {
  it("renders nothing when there is no error", () => {
    const { container } = render(<AssistantErrorNotice error={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows the framework's own wording verbatim", () => {
    /*
      Not paraphrased. These come from eve and the provider and are written for
      a person — "Your credit balance is too low" tells the user this is theirs
      to fix, and a friendlier rewrite would strip exactly that.
    */
    const message =
      "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.";
    render(<AssistantErrorNotice error={message} />);

    expect(screen.getByText(message)).toBeTruthy();
  });

  it("announces itself to assistive technology", () => {
    // It appears without the user doing anything, so it has to be announced
    // rather than only seen.
    render(<AssistantErrorNotice error="Something failed" />);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("is a message, not a dialog — nothing to press and nothing to close", () => {
    /*
      A failure rendered as chrome invites being dismissed and forgotten. This
      one stays in the transcript beside the message that caused it, so there
      is deliberately no control on it at all.
    */
    render(<AssistantErrorNotice error="Something failed" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("keeps the assistant bubble's geometry, changing only the background", () => {
    // It reads as the reply that did not arrive, so it sits where one would:
    // left-aligned, corner-notched, same spacing.
    const { container } = render(<AssistantErrorNotice error="Something failed" />);
    // RTL's own container is a div, so a `div > div` selector matches the
    // wrapper rather than the bubble inside it.
    const row = container.firstElementChild;
    const bubble = row?.firstElementChild;

    expect(bubble?.className).toContain("rounded-bl-sm");
    expect(bubble?.className).toContain("max-w-[85%]");
    expect(row?.className).toContain("mb-6");
  });
});
