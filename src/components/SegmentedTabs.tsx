import { TabContext, useTabContext } from "@components/Tabs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { cn } from "@utils/helpers";
import React from "react";

type Props = {
  value?: string;
  onChange?: (value: string) => void;
  children: React.ReactNode;
};
function SegmentedTabs({ value, onChange, children }: Props) {
  return (
    <TabContext.Provider value={value || ""}>
      <Tabs
        onValueChange={(value) => onChange && onChange(value)}
        value={value}
      >
        {children}
      </Tabs>
    </TabContext.Provider>
  );
}

function List({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsList
      className={cn(
        "bg-gray-100 dark:bg-nb-gray-930/70 p-1.5 rounded-t-lg flex justify-center gap-1 border border-b-0 border-gray-200 dark:border-nb-gray-900",
        className,
      )}
    >
      {children}
    </TabsList>
  );
}

function Trigger({
  children,
  value,
  disabled = false,
}: {
  children: React.ReactNode;
  value: string;
  disabled?: boolean;
}) {
  const currentValue = useTabContext();
  return (
    <TabsTrigger
      disabled={disabled}
      className={cn(
        "py-1 px-6 rounded-md transition-all",
        value == currentValue
          ? "bg-white dark:bg-nb-gray-900"
          : disabled
          ? ""
          : "text-gray-500 dark:text-nb-gray-400 hover:bg-gray-100 dark:hover:bg-nb-gray-900/50",
      )}
      value={value}
    >
      <div className={"flex items-center w-full justify-center gap-2"}>
        {children}
      </div>
    </TabsTrigger>
  );
}

function Content({
  children,
  value,
}: {
  children: React.ReactNode;
  value: string;
}) {
  return (
    <TabsContent
      value={value}
      className={cn(
        "bg-gray-50 dark:bg-nb-gray-930/70 px-4 pt-2 pb-5 rounded-b-md mt-0 border border-t-0 border-gray-200 dark:border-nb-gray-900",
      )}
    >
      {children}
    </TabsContent>
  );
}

SegmentedTabs.List = List;
SegmentedTabs.Trigger = Trigger;
SegmentedTabs.Content = Content;

export { SegmentedTabs };
