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
        "bg-nb-gray-930/70 p-1.5 rounded-t-lg flex justify-center gap-1 border border-b-0 border-nb-gray-900",
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
  className,
}: {
  children: React.ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
}) {
  const currentValue = useTabContext();
  return (
    <TabsTrigger
      disabled={disabled}
      className={cn(
        "px-4 py-2 text-sm rounded-md w-full transition-all data-[disabled]:opacity-10",
        value == currentValue
          ? "bg-nb-gray-900"
          : disabled
          ? ""
          : "text-nb-gray-400 hover:bg-nb-gray-900/50",
        className,
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
      className={
        "bg-nb-gray-930/70 px-4 pt-2 pb-5 rounded-b-md mt-0 border border-t-0  border-nb-gray-900"
      }
    >
      {children}
    </TabsContent>
  );
}

SegmentedTabs.List = List;
SegmentedTabs.Trigger = Trigger;
SegmentedTabs.Content = Content;

export { SegmentedTabs };
