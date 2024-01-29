import { cn } from "@utils/helpers";
import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};
export default function Steps({ children, className }: Props) {
  return <div className={cn("pt-4", className)}>{children}</div>;
}

type StepProps = {
  children: React.ReactNode;
  step: number;
  line?: boolean;
  center?: boolean;
};

const Step = ({ children, step, line = true, center = false }: StepProps) => {
  return (
    <div
      className={cn(
        "flex gap-4 items-start min-w-full justify-start relative pb-6 -mx-1.5 group px-[2px]",
        center && "items-center",
      )}
    >
      {line && (
        <span
          className={
            "h-full w-[2px] bg-nb-gray-100 dark:bg-nb-gray-800 absolute left-0 ml-[18px] z-0 transition-all"
          }
        ></span>
      )}

      <div
        className={cn(
          "h-[34px] w-[34px] shrink-0 rounded-full  flex items-center justify-center font-medium text-xs relative z-0 border-4  transition-all",
          "dark:bg-nb-gray-900 dark:text-nb-gray-400 dark:border-nb-gray dark:group-hover:bg-nb-gray-800",
          "bg-nb-gray-100 text-nb-gray-400 border-white group-hover:bg-nb-gray-200",
        )}
      >
        {step}
      </div>

      <div
        className={cn(
          "gap-2 font-medium text-base pr-1 min-w-0 flex flex-col w-full",
          !center && "mt-[5px]",
        )}
      >
        {children}
      </div>
    </div>
  );
};

Steps.Step = Step;
