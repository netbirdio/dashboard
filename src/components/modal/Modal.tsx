"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DialogProps, DialogTriggerProps } from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { cn } from "@utils/helpers";
import { X } from "lucide-react";
import * as React from "react";
import { ModalInsights } from "@/cloud/analytics/MatomoProvider";
import { headerHeight } from "@/layouts/Header";

// A modal opened while the assistant panel is open is non-modal to Radix,
// so the chat beside it stays usable.
const ASSISTANT_PANEL = '[data-assistant-panel="open"]';
const assistantPanelOpen = () =>
  typeof document !== "undefined" &&
  document.querySelector(ASSISTANT_PANEL) !== null;
const inAssistantPanel = (target: EventTarget | null) =>
  target instanceof Element && target.closest(ASSISTANT_PANEL) !== null;

const ModalModeContext = React.createContext(true);
const BesideAssistantContext = React.createContext(false);

function Modal({
  modal,
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...props
}: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    defaultOpen ?? false,
  );
  const open = openProp ?? uncontrolledOpen;
  // Decided as the modal opens and kept until it closes: switching while open
  // would remount the content and lose whatever was typed into it.
  const [blocking, setBlocking] = React.useState(
    () => !open || !assistantPanelOpen(),
  );
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setBlocking(!assistantPanelOpen());
  }
  const isModal = modal ?? blocking;
  return (
    <ModalModeContext.Provider value={isModal}>
      <BesideAssistantContext.Provider value={modal === undefined && !blocking}>
        <DialogPrimitive.Root
          {...props}
          modal={isModal}
          open={open}
          onOpenChange={(next) => {
            if (openProp === undefined) setUncontrolledOpen(next);
            onOpenChange?.(next);
          }}
        />
      </BesideAssistantContext.Provider>
    </ModalModeContext.Provider>
  );
}

const OTHER_LAYER =
  '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper], [data-toast-notification]';
const MODAL_OVERLAY = "[data-modal-overlay]";

function inOtherLayer(target: EventTarget | null, content: Element | null) {
  if (!(target instanceof Element)) return false;
  if (target.closest(OTHER_LAYER) !== null) return true;
  const overlay = target.closest(MODAL_OVERLAY);
  return overlay !== null && !overlay.contains(content);
}

type TitleRef = React.RefObject<HTMLHeadingElement | null>;
const contentOf = (titleRef: TitleRef) =>
  titleRef.current?.parentElement ?? null;

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]';

function focusLastTabbable(content: HTMLElement) {
  const candidates = Array.from(
    content.querySelectorAll<HTMLElement>(TABBABLE),
  ).filter((el) => el.tabIndex >= 0 && !el.closest("[hidden], [inert]"));
  for (let i = candidates.length - 1; i >= 0; i--) {
    candidates[i].focus({ preventScroll: true });
    if (document.activeElement === candidates[i]) return;
  }
  content.focus({ preventScroll: true });
}

function useFocusReturn(titleRef: TitleRef) {
  React.useEffect(() => {
    let lastInPanel = false;
    let shiftTabbed = false;
    const topmostContent = () => {
      const content = contentOf(titleRef);
      if (!content?.isConnected || content.dataset.state !== "open") {
        return null;
      }
      const overlays = document.querySelectorAll(MODAL_OVERLAY);
      const topmost = overlays[overlays.length - 1];
      return topmost?.contains(content) ? content : null;
    };
    const onPointerDown = (event: PointerEvent) => {
      lastInPanel = inAssistantPanel(event.target);
      shiftTabbed = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      shiftTabbed = event.key === "Tab" && event.shiftKey;
    };
    const onFocusIn = (event: FocusEvent) => {
      const byShiftTab = shiftTabbed;
      shiftTabbed = false;
      lastInPanel = inAssistantPanel(event.target);
      if (lastInPanel) return;
      const content = topmostContent();
      if (
        !content ||
        !(event.target instanceof Node) ||
        content.contains(event.target) ||
        inOtherLayer(event.target, content)
      ) {
        return;
      }
      const leftBackward =
        byShiftTab &&
        event.relatedTarget instanceof Node &&
        content.contains(event.relatedTarget) &&
        (content.compareDocumentPosition(event.target) &
          Node.DOCUMENT_POSITION_PRECEDING) !==
          0;
      if (leftBackward) focusLastTabbable(content);
      else content.focus({ preventScroll: true });
    };
    const observer = new MutationObserver(() => {
      if (document.activeElement !== document.body || lastInPanel) return;
      topmostContent()?.focus({ preventScroll: true });
    });
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn);
      observer.disconnect();
    };
  }, [titleRef]);
}

function FocusReturn({ titleRef }: Readonly<{ titleRef: TitleRef }>) {
  useFocusReturn(titleRef);
  return null;
}

function useBesideAssistant() {
  const besideAssistant = React.useContext(BesideAssistantContext);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const isOtherLayer = React.useCallback(
    (target: EventTarget | null) =>
      besideAssistant && inOtherLayer(target, contentOf(titleRef)),
    [besideAssistant],
  );
  return { besideAssistant, titleRef, isOtherLayer };
}

type OutsideEvent = { target: EventTarget | null; preventDefault: () => void };

function keepOpenForAssistant<E extends OutsideEvent>(
  handler?: (event: E) => void,
  isOtherLayer?: (target: EventTarget | null) => boolean,
) {
  return (event: E) => {
    if (inAssistantPanel(event.target) || isOtherLayer?.(event.target)) {
      event.preventDefault();
      return;
    }
    handler?.(event);
  };
}

function keepOpenOnFocusOutside<E extends OutsideEvent>(
  handler: ((event: E) => void) | undefined,
  besideAssistant: boolean,
) {
  if (!besideAssistant) return handler;
  return (event: E) => {
    handler?.(event);
    event.preventDefault();
  };
}

const ModalTrigger = (props: DialogTriggerProps) => {
  return (
    <DialogPrimitive.Trigger
      {...props}
      onClick={(e) => {
        e.stopPropagation();
        props.onClick && props.onClick(e);
      }}
    />
  );
};

const ModalPortal = DialogPrimitive.Portal;

const ModalClose = DialogPrimitive.Close;

const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  // Radix renders no overlay for a non-modal dialog.
  const isModal = React.useContext(ModalModeContext);
  const Overlay = isModal ? DialogPrimitive.Overlay : "div";
  return (
    <Overlay
      ref={ref}
      data-modal-overlay=""
      {...(isModal ? {} : { "data-state": "open" })}
      className={cn(
        // Not `fixed inset-0`: modals must stay out of the assistant panel's strip.
        "nb-overlay-inset grid z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ",
        "mx-auto place-items-start overflow-y-auto md:py-16",
        "bg-black/30 dark:bg-black/40 backdrop-blur-sm",
        className,
      )}
      style={{ scrollbarGutter: "stable both-edges" }}
      {...props}
    />
  );
});
ModalOverlay.displayName = DialogPrimitive.Overlay.displayName;

type ModalContentProps = {
  showClose?: boolean;
  maxWidthClass?: string;
  flow?: string;
};

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> &
    ModalContentProps
>(
  (
    {
      className,
      children,
      showClose = true,
      maxWidthClass = "max-w-3xl",
      onPointerDownOutside,
      onInteractOutside,
      onFocusOutside,
      onEscapeKeyDown,
      flow,
      ...props
    },
    ref,
  ) => {
    const { besideAssistant, titleRef, isOtherLayer } = useBesideAssistant();
    return (
      <ModalPortal>
        <ModalOverlay>
          <DialogPrimitive.Content
            ref={ref}
            className={cn(
              "mx-auto relative top-0 z-[52] grid w-full focus:outline-none border border-nb-gray-600 dark:border-nb-gray-900 bg-white py-6 dark:shadow-lg shadow-sm duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1  data-[state=open]:slide-in-from-left-1 sm:rounded-lg md:w-full dark:bg-nb-gray",
              className,
              maxWidthClass,
            )}
            onPointerDownOutside={(e) => {
              // Prevent closing modal when clicking on toast notifications
              try {
                const target = e.target as HTMLElement;
                if (target?.closest("[data-toast-notification]")) {
                  e.preventDefault();
                  return;
                }
              } catch {
                // Ignore errors
              }
              onPointerDownOutside?.(e);
            }}
            onInteractOutside={keepOpenForAssistant(
              onInteractOutside,
              isOtherLayer,
            )}
            onFocusOutside={keepOpenOnFocusOutside(
              onFocusOutside,
              besideAssistant,
            )}
            onEscapeKeyDown={keepOpenForAssistant(onEscapeKeyDown)}
            {...props}
            onClick={(e) => e.stopPropagation()}
          >
            <VisuallyHidden asChild>
              <DialogPrimitive.Title ref={titleRef}>
                Dialog
              </DialogPrimitive.Title>
            </VisuallyHidden>
            {besideAssistant && <FocusReturn titleRef={titleRef} />}
            {flow && <ModalInsights flow={flow} />}
            {children}
            {showClose && (
              <DialogPrimitive.Close
                data-testid={"modal-close"}
                className="absolute right-4 z-10 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-neutral-100 data-[state=open]:text-neutral-500 dark:ring-offset-neutral-950 dark:focus:ring-neutral-300 dark:data-[state=open]:bg-neutral-800 dark:data-[state=open]:text-neutral-400"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            )}
          </DialogPrimitive.Content>
        </ModalOverlay>
      </ModalPortal>
    );
  },
);
ModalContent.displayName = DialogPrimitive.Content.displayName;

const SidebarModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> &
    ModalContentProps
>(
  (
    {
      className,
      children,
      showClose = true,
      maxWidthClass = "max-w-3xl",
      onInteractOutside,
      onFocusOutside,
      onEscapeKeyDown,
      ...props
    },
    ref,
  ) => {
    const { besideAssistant, titleRef, isOtherLayer } = useBesideAssistant();
    return (
      <ModalPortal>
        <div
          data-modal-overlay=""
          className={cn(
            "nb-overlay-inset grid z-50 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        >
          <DialogPrimitive.Content
            ref={ref}
            className={cn(
              "ml-auto mt-auto relative bottom-0 z-[52] grid w-full border border-nb-gray-600 dark:border-nb-gray-900 bg-white py-6 dark:shadow-lg shadow-sm duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0  data-[state=closed]:slide-out-to-left-1  data-[state=open]:slide-in-from-left-1 md:w-full dark:bg-nb-gray",
              "border-t-0 border-r-0 border-b-0 shadow-2xl",
              className,
              maxWidthClass,
            )}
            onInteractOutside={keepOpenForAssistant(
              onInteractOutside,
              isOtherLayer,
            )}
            onFocusOutside={keepOpenOnFocusOutside(
              onFocusOutside,
              besideAssistant,
            )}
            onEscapeKeyDown={keepOpenForAssistant(onEscapeKeyDown)}
            {...props}
            style={{
              height: `calc(100vh - ${
                headerHeight + 100 - 2
              }px - var(--nb-overlay-top) - var(--nb-overlay-bottom))`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <VisuallyHidden asChild>
              <DialogPrimitive.Title ref={titleRef}>
                Dialog
              </DialogPrimitive.Title>
            </VisuallyHidden>
            {besideAssistant && <FocusReturn titleRef={titleRef} />}
            {children}
            {showClose && (
              <DialogPrimitive.Close
                data-testid={"modal-close"}
                className="absolute right-4 z-10 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-neutral-100 data-[state=open]:text-neutral-500 dark:ring-offset-neutral-950 dark:focus:ring-neutral-300 dark:data-[state=open]:bg-neutral-800 dark:data-[state=open]:text-neutral-400"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            )}
          </DialogPrimitive.Content>
        </div>
      </ModalPortal>
    );
  },
);
SidebarModalContent.displayName = DialogPrimitive.Content.displayName;

type ModalFooterProps = {
  variant?: "setup" | "default";
  separator?: boolean;
};
const ModalFooter = ({
  className,
  variant = "default",
  separator = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & ModalFooterProps) => (
  <div
    className={cn(
      "dark:border-nb-gray-800/70 border-nb-gray-800",
      separator && "border-t bg-nb-gray-950 dark:bg-transparent",
      // Seamless footers keep the modal background; separated footers carry
      // their light tint through the modal's bottom padding.
      "-mb-6 pb-6 sm:rounded-b-lg",
    )}
  >
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2",
        variant === "setup" && "px-6 pb-3 pt-8",
        variant === "default" && "px-8 pb-1 pt-6",
        className,
      )}
      {...props}
    />
  </div>
);
ModalFooter.displayName = "DialogFooter";

const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
ModalTitle.displayName = DialogPrimitive.Title.displayName;

const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-neutral-500 dark:text-neutral-400", className)}
    {...props}
  />
));
ModalDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalOverlay,
  ModalPortal,
  ModalTitle,
  ModalTrigger,
  SidebarModalContent,
};
