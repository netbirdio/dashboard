import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal, ModalContent, SidebarModalContent } from "./Modal";

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

function PageWithConfirm({
  panelOpen,
  onOpenChange,
  sidebar = false,
}: Readonly<{
  panelOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sidebar?: boolean;
}>) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const Content = sidebar ? SidebarModalContent : ModalContent;
  return (
    <>
      <Panel open={panelOpen} />
      <button>Page button</button>
      <div data-toast-notification>
        <button>Copy toast</button>
      </div>
      <button onClick={() => setOpen(true)}>Open modal</button>
      <Modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange(next);
        }}
      >
        <Content data-testid="form">
          <input aria-label="Name" />
          <button onClick={() => setConfirming(true)}>Submit</button>
        </Content>
      </Modal>
      <Modal open={confirming} onOpenChange={setConfirming}>
        <ModalContent
          data-testid="confirm"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <button onClick={() => setConfirming(false)}>Confirm</button>
          <DropdownMenu modal={false} open>
            <DropdownMenuTrigger>Options</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Option A</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ModalContent>
      </Modal>
    </>
  );
}

const settle = () =>
  act(() => new Promise((resolve) => setTimeout(resolve, 0)));

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

  it.each([
    ["ModalContent", false],
    ["SidebarModalContent", true],
  ])(
    "%s stays open under a confirm dialog rendered outside its tree",
    async (_name, sidebar) => {
      const onOpenChange = vi.fn();
      render(
        <PageWithConfirm
          panelOpen
          onOpenChange={onOpenChange}
          sidebar={sidebar}
        />,
      );
      fireEvent.click(screen.getByText("Open modal"));
      await settle();
      fireEvent.click(screen.getByText("Submit"));
      await settle();

      const confirm = screen.getByText("Confirm");
      act(() => confirm.focus());
      fireEvent.pointerDown(confirm);
      await settle();

      expect(onOpenChange).not.toHaveBeenCalledWith(false);
      expect(screen.getByLabelText("Name")).toBeTruthy();
    },
  );

  it.each([
    ["ModalContent", false],
    ["SidebarModalContent", true],
  ])(
    "%s stays open when a toast is focused or pressed",
    async (_name, sidebar) => {
      const onOpenChange = vi.fn();
      render(
        <PageWithConfirm
          panelOpen
          onOpenChange={onOpenChange}
          sidebar={sidebar}
        />,
      );
      fireEvent.click(screen.getByText("Open modal"));
      await settle();

      const toast = screen.getByText("Copy toast");
      act(() => toast.focus());
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
      fireEvent.pointerDown(toast);
      await settle();

      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    },
  );

  it("still closes on a press on the page outside the modal and the panel, and on Escape", async () => {
    const onOpenChange = vi.fn();
    render(<PageWithConfirm panelOpen onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText("Open modal"));
    await settle();

    fireEvent.pointerDown(screen.getByText("Page button"));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    onOpenChange.mockClear();
    fireEvent.click(screen.getByText("Open modal"));
    await settle();
    fireEvent.keyDown(screen.getByLabelText("Name"), { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it.each([
    ["ModalContent", false],
    ["SidebarModalContent", true],
  ])(
    "%s stays open when the backdrop of a confirm above it is pressed",
    async (_name, sidebar) => {
      const onOpenChange = vi.fn();
      render(
        <PageWithConfirm
          panelOpen
          onOpenChange={onOpenChange}
          sidebar={sidebar}
        />,
      );
      fireEvent.click(screen.getByText("Open modal"));
      await settle();
      fireEvent.click(screen.getByText("Submit"));
      await settle();

      fireEvent.pointerDown(screen.getByTestId("confirm").parentElement!);
      await settle();

      expect(onOpenChange).not.toHaveBeenCalledWith(false);
      expect(screen.getByLabelText("Name")).toBeTruthy();
      expect(screen.getByText("Confirm")).toBeTruthy();
    },
  );

  it("stays open when a menu item portaled out of a confirm above it is pressed", async () => {
    const onOpenChange = vi.fn();
    render(<PageWithConfirm panelOpen onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText("Open modal"));
    await settle();
    fireEvent.click(screen.getByText("Submit"));
    await settle();

    const item = screen.getByText("Option A");
    expect(item.closest('[role="dialog"]')).toBeNull();
    fireEvent.pointerDown(item);
    await settle();

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByLabelText("Name")).toBeTruthy();
  });

  it.each([
    ["ModalContent", false],
    ["SidebarModalContent", true],
  ])(
    "%s still closes on a press on its own backdrop",
    async (_name, sidebar) => {
      const onOpenChange = vi.fn();
      render(
        <PageWithConfirm
          panelOpen
          onOpenChange={onOpenChange}
          sidebar={sidebar}
        />,
      );
      fireEvent.click(screen.getByText("Open modal"));
      await settle();

      fireEvent.pointerDown(screen.getByTestId("form").parentElement!);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    },
  );

  it("takes focus back when a confirm above it closes, so Tab does not start on the page behind", async () => {
    render(<PageWithConfirm panelOpen onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByText("Open modal"));
    await settle();
    fireEvent.click(screen.getByText("Submit"));
    await settle();
    const confirm = screen.getByText("Confirm");
    act(() => confirm.focus());

    fireEvent.click(confirm);
    await settle();

    expect(screen.queryByText("Confirm")).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId("form"));
  });

  it("takes focus back from the page behind it, but leaves it in the panel", async () => {
    render(<PageWithConfirm panelOpen onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByText("Open modal"));
    await settle();

    act(() => screen.getByText("Page button").focus());
    expect(document.activeElement).toBe(screen.getByTestId("form"));

    const chat = screen.getByLabelText("Chat");
    act(() => chat.focus());
    expect(document.activeElement).toBe(chat);
  });

  it("does not pull focus out of the panel when something there is removed", async () => {
    function WithRemovableChatButton() {
      const [open, setOpen] = useState(false);
      const [approved, setApproved] = useState(false);
      return (
        <>
          <aside data-assistant-panel="open">
            {!approved && (
              <button onClick={() => setApproved(true)}>Approve</button>
            )}
          </aside>
          <button onClick={() => setOpen(true)}>Open modal</button>
          <Modal open={open} onOpenChange={setOpen}>
            <ModalContent data-testid="form">
              <input aria-label="Name" />
            </ModalContent>
          </Modal>
        </>
      );
    }
    render(<WithRemovableChatButton />);
    fireEvent.click(screen.getByText("Open modal"));
    await settle();
    const approve = screen.getByText("Approve");
    act(() => approve.focus());

    fireEvent.click(approve);
    await settle();

    expect(document.activeElement).toBe(document.body);
  });

  it("removes its focus listeners and observer when it closes", async () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const installed = (type: string) =>
      add.mock.calls.filter((call) => call[0] === type).length -
      remove.mock.calls.filter((call) => call[0] === type).length;
    let observers = 0;
    const NativeObserver = window.MutationObserver;
    window.MutationObserver = class extends NativeObserver {
      constructor(callback: MutationCallback) {
        super(callback);
        observers++;
      }
      disconnect() {
        observers--;
        super.disconnect();
      }
    };
    try {
      render(<PageWithConfirm panelOpen onOpenChange={vi.fn()} />);
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByText("Open modal"));
        await settle();
        expect(observers).toBe(1);
        expect(installed("keydown")).toBeGreaterThan(0);
        fireEvent.keyDown(screen.getByLabelText("Name"), { key: "Escape" });
        await settle();
        expect(screen.queryByLabelText("Name")).toBeNull();
      }
      expect(observers).toBe(0);
      expect(installed("focusin")).toBe(0);
      expect(installed("pointerdown")).toBe(0);
      expect(installed("keydown")).toBe(0);
    } finally {
      add.mockRestore();
      remove.mockRestore();
      window.MutationObserver = NativeObserver;
    }
  });

  it("wraps Shift+Tab from the modal itself to its last control, and sends other stray focus to the modal", async () => {
    render(<PageWithConfirm panelOpen onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByText("Open modal"));
    await settle();
    const form = screen.getByTestId("form");
    const pageButton = screen.getByText("Page button");

    act(() => form.focus());
    fireEvent.keyDown(form, { key: "Tab", shiftKey: true });
    act(() => pageButton.focus());
    expect(document.activeElement).toBe(screen.getByTestId("modal-close"));

    act(() => form.focus());
    fireEvent.keyDown(form, { key: "Tab" });
    act(() => pageButton.focus());
    expect(document.activeElement).toBe(form);

    act(() => form.focus());
    act(() => pageButton.focus());
    expect(document.activeElement).toBe(form);
  });

  it("moves Tab past either end of the modal into the panel, instead of wrapping inside the modal", async () => {
    render(<PageWithConfirm panelOpen onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByText("Open modal"));
    await settle();
    const chat = screen.getByLabelText("Chat");
    const first = screen.getByLabelText("Name");
    const last = screen.getByTestId("modal-close");

    act(() => last.focus());
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(chat);

    act(() => first.focus());
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(chat);

    act(() => first.focus());
    fireEvent.keyDown(first, { key: "Tab" });
    expect(document.activeElement).toBe(first);
  });

  it("keeps closing on focus outside while the panel is closed and the modal is non-modal by prop", async () => {
    const onOpenChange = vi.fn();
    render(
      <>
        <button>Page button</button>
        <Modal open modal={false} onOpenChange={onOpenChange}>
          <ModalContent>
            <input aria-label="Name" />
          </ModalContent>
        </Modal>
      </>,
    );
    await settle();
    act(() => screen.getByText("Page button").focus());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
