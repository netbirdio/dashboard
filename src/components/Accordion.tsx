"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { cn } from "@utils/helpers";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import * as React from "react";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={cn("", className)} {...props} />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center gap-4 font-medium [&[data-state=open]>svg.chevron]:rotate-180 hover:opacity-80 my-2",
        className,
      )}
      {...props}
    >
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 chevron" />
      {children}
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children }, ref) => {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const el = wrapperRef.current?.closest("[data-state]");
    if (!el) return;

    const update = () => setIsOpen(el.getAttribute("data-state") === "open");
    update();

    const observer = new MutationObserver(update);
    observer.observe(el, { attributes: true, attributeFilter: ["data-state"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef}>
      <motion.div
        ref={ref}
        initial={false}
        animate={{
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={cn("overflow-hidden text-sm", className)}
      >
        <div className="pt-0">{children}</div>
      </motion.div>
    </div>
  );
});
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
