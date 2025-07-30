import { cn } from "@utils/helpers";
import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  horizontal?: boolean;
};
export default function Steps({
  children,
  className,
  horizontal = false,
}: Readonly<Props>) {
  return (
    <div className={cn("pt-4", horizontal && "flex", className)}>
      {children}
    </div>
  );
}

type StepProps = {
  children: React.ReactNode;
  step: number;
  line?: boolean;
  center?: boolean;
  horizontal?: boolean;
  disabled?: boolean;
  className?: string;
};

const Step = ({
  children,
  step,
  line = true,
  center = false,
  horizontal,
  disabled = false,
  className,
}: StepProps) => {
  return (
    <div
      className={cn(
        "flex gap-4 items-start  justify-start relative pb-6 -mx-1.5 group px-[2px]",
        center && "items-center",
        horizontal ? "flex-col items-center" : "min-w-full",
        disabled && "opacity-40 pointer-events-none",
        className,
      )}
    >
      {line && (
        <span
          className={cn(
            "bg-nb-gray-100 dark:bg-nb-gray-800  z-0 transition-all",
            horizontal
              ? "w-full h-[2px] absolute mt-[16px] transform translate-x-1/2"
              : "h-full w-[2px] absolute left-0 ml-[18px]",
          )}
        ></span>
      )}

      <div
        className={cn(
          "h-[34px] w-[34px] shrink-0 rounded-full  flex items-center justify-center font-medium text-xs relative z-0 border-4  transition-all",
          "dark:bg-nb-gray-900 dark:text-nb-gray-400 dark:border-nb-gray dark:group-hover:bg-nb-gray-800",
          "bg-nb-gray-100 text-nb-gray-400 border-white group-hover:bg-nb-gray-200 step-circle",
          "[.stepper-bg-variant]:border-nb-gray-940",
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
