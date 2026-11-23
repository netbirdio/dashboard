import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AssistantErrorNotice } from "@/modules/assistant/chat/AssistantErrorNotice";

afterEach(cleanup);

describe("AssistantErrorNotice", () => {
  it("renders nothing when there is no error", () => {
    const { container } = render(<AssistantErrorNotice error={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows the framework's own wording verbatim", () => {
    const message =
      "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.";
    render(<AssistantErrorNotice error={message} />);

    expect(screen.getByText(message)).toBeTruthy();
  });

  it("announces itself to assistive technology", () => {
    render(<AssistantErrorNotice error="Something failed" />);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("is a message, not a dialog — nothing to press and nothing to close", () => {
    render(<AssistantErrorNotice error="Something failed" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("keeps the assistant bubble's geometry, changing only the background", () => {
    const { container } = render(
      <AssistantErrorNotice error="Something failed" />,
    );
    const row = container.firstElementChild;
    const bubble = row?.firstElementChild;

    expect(bubble?.className).toContain("rounded-bl-sm");
    expect(bubble?.className).toContain("max-w-[85%]");
    expect(row?.className).toContain("mb-6");
  });
});
