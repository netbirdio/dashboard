import { TabContext, useTabContext } from "@components/Tabs";
import * as Tabs from "@radix-ui/react-tabs";
import { TabsTrigger } from "@radix-ui/react-tabs";
import { cn } from "@utils/helpers";
import { useIsLg } from "@utils/responsive";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
};

const TabSwitchContext = React.createContext<{
  switchTab: (value: string) => void;
}>({
  switchTab: () => {},
});

export const useTabSwitchContext = () => {
  return React.useContext(TabSwitchContext);
};

function VerticalTabs({ value, onChange, children }: Props) {
  return (
    <TabContext.Provider value={value || ""}>
      <TabSwitchContext.Provider
        value={{
          switchTab: (value: string) => {
            onChange(value);
          },
        }}
      >
        <Tabs.Root
          orientation={"vertical"}
          className={"block lg:flex bg-nb-gray"}
          value={value}
          onValueChange={(value) => onChange(value)}
        >
          {children}
        </Tabs.Root>
      </TabSwitchContext.Provider>
    </TabContext.Provider>
  );
}

function List({ children }: { children: React.ReactNode }) {
  const isLg = useIsLg();
  return (
    <Tabs.List
      className={cn(
        "px-4 py-4 whitespace-nowrap overflow-y-hidden shrink-0 no-scrollbar",
        "lg:h-full items-start bg-nb-gray border-b border-nb-gray-930",
        "flex lg:flex-col lg:gap-1",
      )}
      style={{
        height: isLg ? "calc(100vh - 75px)" : "auto",
      }}
    >
      {children}
    </Tabs.List>
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
  const pathname = usePathname();
  const router = useRouter();
  return (
    <TabsTrigger
      disabled={disabled}
      className={cn(
        "py-2 text-base rounded-md w-full transition-all data-[disabled]:opacity-10",
        "lg:pl-6 lg:pr-8 pl-4 pr-4 text-center lg:text-left",
        value == currentValue
          ? "bg-nb-gray-920"
          : disabled
          ? ""
          : "text-nb-gray-500 hover:bg-nb-gray-900/50",
      )}
      value={value}
      onClick={() => {
        router.push(pathname + `?tab=${value}`, {
          scroll: false,
        });
      }}
    >
      <div
        className={
          "flex items-center w-full justify-center lg:justify-start gap-2.5"
        }
      >
        {children}
      </div>
    </TabsTrigger>
  );
}

VerticalTabs.Trigger = Trigger;
VerticalTabs.List = List;

export { VerticalTabs };
