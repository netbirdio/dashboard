import { cn } from "@utils/helpers";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { useState } from "react";

type Props = {
  defaultValue?: string;
  children: React.ReactNode;
  className?: string;
};

const SlidingTabContext = React.createContext(
  {} as {
    current: string | undefined;
    onChange: (value: string) => void;
    back: () => void;
  },
);

export const useSlidingTabContext = () => {
  const context = React.useContext(SlidingTabContext);
  if (!context) {
    throw new Error("TabContext is not found");
  }
  return context;
};

export const SlidingTabs = (props: Props) => {
  const [current, setCurrent] = useState<string | undefined>();

  return (
    <SlidingTabContext.Provider
      value={{
        current: current,
        onChange: setCurrent,
        back: () => setCurrent(undefined),
      }}
    >
      <div className={cn("overflow-hidden relative", props.className)}>
        <AnimatePresence initial={false} mode={"popLayout"}>
          <motion.div
            key={current}
            className={"z-10 relative"}
            initial={{
              x: current != undefined ? 50 : -100,
              opacity: 0,
            }}
            animate={{
              x: 0,
              opacity: 1,
            }}
            exit={{
              x: current != undefined ? 100 : 0,
              opacity: 0,
            }}
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30, duration: 0.3 },
              opacity: { duration: 0.15 },
            }}
          >
            {props.children}
          </motion.div>
        </AnimatePresence>
      </div>
    </SlidingTabContext.Provider>
  );
};

export const SlidingTabsList = (props: Props) => {
  const { onChange, current } = useSlidingTabContext();
  return !current ? <div>{props.children}</div> : null;
};

export const SlidingTabsTrigger = ({
  value,
  children,
  title,
  description,
  icon,
  iconClass = "bg-gradient-to-tr from-netbird-200 to-netbird-100",
}: {
  value: string;
  children?: React.ReactNode;
  title?: string;
  description?: string;
  iconClass?: string;
  icon?: React.ReactNode;
}) => {
  const { onChange, current } = useSlidingTabContext();
  return (
    <div onClick={() => onChange(value)}>
      <div
        className={
          "hover:bg-nb-gray-920/80 border border-transparent hover:border-nb-gray-900 rounded-md flex flex-col items-center transition-all cursor-pointer"
        }
      >
        <div className={"flex gap-4 items-center w-full px-4 py-3"}>
          <div
            className={cn(
              "h-9 w-9 shrink-0  shadow-xl  rounded-md flex items-center justify-center select-none",
              iconClass,
            )}
          >
            {icon}
          </div>
          <div className={"pr-10"}>
            <div className={"text-sm font-medium flex gap-2 items-center"}>
              {title}
            </div>
            <div className={"text-xs mt-0.5 text-nb-gray-300"}>
              {description}
            </div>
          </div>
          <div className={"ml-auto flex gap-2 items-center "}>
            <ChevronRight size={22} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const SlidingTabsPanel = ({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) => {
  const { current } = useSlidingTabContext();
  return current == value ? <>{children}</> : null;
};

export const SlidingTabsBackTrigger = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { back } = useSlidingTabContext();
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        back();
      }}
      className={"flex gap-2 items-center select-none cursor-pointer"}
    >
      <ChevronLeft size={18} />
      Back
    </div>
  );
};
