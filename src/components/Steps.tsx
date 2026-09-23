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

// Steps without a status keep the neutral look of the instruction-list
// steppers, where no step is ever "reached".
type StepStatus = "complete" | "current" | "upcoming";

// The rail has to meet the middle of the circle, so its offset is half the
// circle and moves with the size.
const stepSizes = {
  default: {
    circle: "h-[34px] w-[34px]",
    railHorizontal: "mt-[16px]",
    railVertical: "ml-[18px]",
  },
  large: {
    circle: "h-[44px] w-[44px]",
    railHorizontal: "mt-[21px]",
    railVertical: "ml-[23px]",
  },
};

type StepProps = {
  children: React.ReactNode;
  step: React.ReactNode;
  line?: boolean;
  center?: boolean;
  horizontal?: boolean;
  disabled?: boolean;
  status?: StepStatus;
  size?: keyof typeof stepSizes;
  className?: string;
};

const Step = ({
  children,
  step,
  line = true,
  center = false,
  horizontal,
  disabled = false,
  status,
  size = "default",
  className,
}: StepProps) => {
  const sizing = stepSizes[size];

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
              ? cn(
                  "w-full h-[2px] absolute transform translate-x-1/2",
                  sizing.railHorizontal,
                )
              : cn("h-full w-[2px] absolute left-0", sizing.railVertical),
            // The line trails its step, so a completed step also means the hop
            // to the next one is behind us.
            status === "complete" && "bg-netbird dark:bg-netbird",
          )}
        ></span>
      )}

      <div
        className={cn(
          "shrink-0 rounded-full flex items-center justify-center font-medium text-xs relative z-0 border-4 transition-all",
          sizing.circle,
          "dark:bg-nb-gray-900 dark:text-nb-gray-400 dark:border-nb-gray",
          "bg-nb-gray-100 text-nb-gray-400 border-white step-circle",
          "[.stepper-bg-variant]:border-nb-gray-940",
          !status &&
            "group-hover:bg-nb-gray-200 dark:group-hover:bg-nb-gray-800",
          status && "border-white dark:border-nb-gray-940",
          status === "complete" &&
            "bg-netbird text-white dark:bg-netbird dark:text-white",
          status === "current" && "text-nb-gray-800 dark:text-white",
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
