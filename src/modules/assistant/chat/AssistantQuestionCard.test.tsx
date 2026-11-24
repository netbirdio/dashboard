import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantQuestionCard, numbersPickOptions } from "./AssistantQuestionCard";
import { ARMING_DELAY_MS } from "./useArmingDelay";

const question = {
  id: "req-1",
  title: "Which network?",
  options: [{ label: "Office" }, { label: "Datacenter" }],
  multi: false,
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("AssistantQuestionCard", () => {
  it("answers nothing until the card has been on screen for a moment", () => {
    const onAnswer = vi.fn();
    const onDismiss = vi.fn();
    render(<AssistantQuestionCard question={question} onAnswer={onAnswer} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByText("Office"));
    fireEvent.click(screen.getByLabelText("Dismiss"));
    expect(onAnswer).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(ARMING_DELAY_MS));
    fireEvent.click(screen.getByText("Datacenter"));
    expect(onAnswer).toHaveBeenCalledWith([1]);
  });
});

describe("numbersPickOptions", () => {
  const options = (...labels: string[]) => labels.map((label) => ({ label }));

  it.each([
    [["2h", "4h", "8h", "24h"]],
    [["1d", "7d", "30d"]],
    [["80/tcp", "443/tcp"]],
    [["100%", "50%"]],
    [["5-10 peers", "Unlimited"]],
    [["3rd party", "Internal"]],
    [["Passkey", " 2FA"]],
    [["7", "30 days"]],
  ])("reads no number as a position where free text is taken and an option of %j starts with a digit", (labels) => {
    expect(numbersPickOptions(options(...labels), true)).toBe(false);
  });

  it("reads a number as a position where no option starts with a digit", () => {
    expect(numbersPickOptions(options("Office", "Option 2", "v2"), true)).toBe(true);
  });

  it("always reads a number as a position where free text is not taken", () => {
    expect(numbersPickOptions(options("2h", "4h"), false)).toBe(true);
  });
});
