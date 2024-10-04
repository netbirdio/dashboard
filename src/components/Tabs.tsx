"use client";

import { ScrollArea, ScrollBar } from "@components/ScrollArea";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@utils/helpers";
import { motion } from "framer-motion";
import * as React from "react";
import { useState } from "react";

export const TabContext = React.createContext("");

export const useTabContext = () => {
  return React.useContext(TabContext);
};

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ className, onValueChange, ...props }, ref) => {
  const [tabValue, setTabValue] = useState(
    props.defaultValue ? props.defaultValue : "",
  );

  return (
    <TabContext.Provider value={props.value ? props.value : tabValue}>
      <TabsPrimitive.Root
        ref={ref}
        value={props.value ? props.value : tabValue}
        onValueChange={(v) => {
          setTabValue(v);
          onValueChange && onValueChange(v);
        }}
        className={cn("relative min-w-0", className)}
        {...props}
      />
    </TabContext.Provider>
  );
});
Tabs.displayName = TabsPrimitive.Root.displayName;

type TabListProps = {
  justify?: "start" | "end" | "center";
};

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & TabListProps
>(({ className, justify = "center", ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex flex-nowrap text-neutral-500 dark:text-nb-gray-400 w-full relative",
      className,
      justify == "center" && "justify-center justify-items-end",
      justify == "start" && "justify-start",
      justify == "end" && "justify-end",
    )}
    {...props}
  >
    <span
      className={
        "absolute left-0 dark:bg-nb-gray-900 bg-nb-gray-100 w-full h-[1px] bottom-0 z-0"
      }
    />
    <ScrollArea>
      <div className={"relative z-[1] flex flex-nowrap"}>{props.children}</div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  </TabsPrimitive.List>
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const currentValue = useTabContext();

  return (
    <TabsPrimitive.Trigger ref={ref} asChild={true} {...props}>
      <div
        className={cn(
          "inline-flex items-center transition-all justify-center whitespace-nowrap px-3 pt-1.5 pb-3 text-sm font-normal",
          "data-[state=active]:text-netbird cursor-pointer  dark:data-[state=active]:text-netbird group/trigger gap-2",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          "relative data-[state=inactive]:hover:text-neutral-900 dark:data-[state=inactive]:hover:text-nb-gray-500",
          className,
        )}
      >
        <motion.div
          className={cn(
            "absolute w-full h-[1px] left-0 right-0 bottom-[0px] transition-all",
            currentValue === props.value
              ? "bg-netbird text-netbird"
              : "dark:bg-nb-gray-900 bg-nb-gray-100 group-hover/trigger:dark:bg-nb-gray-700 group-hover/trigger:bg-nb-gray-200",
          )}
        ></motion.div>

        {props.children}
      </div>
    </TabsPrimitive.Trigger>
  );
});

TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-2 pt-4 outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export default function TabsContentPadding({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={"px-6 py-2"}>{children}</div>;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
