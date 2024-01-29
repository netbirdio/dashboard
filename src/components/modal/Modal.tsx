"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DialogTriggerProps } from "@radix-ui/react-dialog";
import { cn } from "@utils/helpers";
import { X } from "lucide-react";
import * as React from "react";

const Modal = DialogPrimitive.Root;

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
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 dark:bg-neutral-950/70",
      "place-items-center overflow-y-auto",
      className,
    )}
    {...props}
  />
));
ModalOverlay.displayName = DialogPrimitive.Overlay.displayName;

type ModalContentProps = {
  showClose?: boolean;
  maxWidthClass?: string;
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
      ...props
    },
    ref,
  ) => (
    <ModalPortal>
      <ModalOverlay>
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed left-[50%] top-0 md:top-[5%] z-50 grid w-full translate-x-[-50%] border border-neutral-200 bg-white py-6 dark:shadow-lg shadow-sm duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2  data-[state=open]:slide-in-from-left-1/2 ] sm:rounded-lg md:w-full dark:border-nb-gray-900 dark:bg-nb-gray",
            className,
            maxWidthClass,
          )}
          {...props}
          onClick={(e) => e.stopPropagation()}
        >
          <>
            {children}
            {showClose && (
              <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-neutral-100 data-[state=open]:text-neutral-500 dark:ring-offset-neutral-950 dark:focus:ring-neutral-300 dark:data-[state=open]:bg-neutral-800 dark:data-[state=open]:text-neutral-400">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            )}
          </>
        </DialogPrimitive.Content>
      </ModalOverlay>
    </ModalPortal>
  ),
);
ModalContent.displayName = DialogPrimitive.Content.displayName;

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
      "dark:border-nb-gray-800/70 border-nb-gray-100",
      separator && "border-t",
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
};
