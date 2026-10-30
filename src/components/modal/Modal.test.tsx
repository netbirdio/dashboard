import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal, ModalContent } from "./Modal";

/** The assistant panel as the chat renders it: marked, and holding a textarea. */
function Panel({ open }: Readonly<{ open: boolean }>) {
  return (
    <aside data-assistant-panel={open ? "open" : "closed"}>
      <textarea aria-label="Chat" />
    </aside>
  );
}

function Page({
  panelOpen,
  onOpenChange,
}: Readonly<{ panelOpen: boolean; onOpenChange?: (open: boolean) => void }>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Panel open={panelOpen} />
      <button onClick={() => setOpen(true)}>Open modal</button>
      <Modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange?.(next);
        }}
      >
        <ModalContent>
          <input aria-label="Name" />
        </ModalContent>
      </Modal>
    </>
  );
}

afterEach(cleanup);

describe("a modal beside the assistant panel", () => {
  it("blocks the page as before while the panel is closed", () => {
    render(<Page panelOpen={false} />);
    fireEvent.click(screen.getByText("Open modal"));
    expect(document.body.style.pointerEvents).toBe("none");
  });

  it("leaves the open panel usable: no pointer lock, focus stays in the chat, and clicking there keeps the modal open", async () => {
    const onOpenChange = vi.fn();
    render(<Page panelOpen onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText("Open modal"));
    expect(screen.getByLabelText("Name")).toBeTruthy();
    expect(document.body.style.pointerEvents).not.toBe("none");

    const chat = screen.getByLabelText("Chat");
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    fireEvent.pointerDown(chat);
    act(() => chat.focus());
    expect(document.activeElement).toBe(chat);
    fireEvent.keyDown(chat, { key: "Escape" });

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByLabelText("Name")).toBeTruthy();
  });

  it("keeps its mode while open, so opening the panel mid-form does not remount what was typed", () => {
    const { rerender } = render(<Page panelOpen={false} />);
    fireEvent.click(screen.getByText("Open modal"));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Printer" },
    });
    rerender(<Page panelOpen />);
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
      "Printer",
    );
  });
});
