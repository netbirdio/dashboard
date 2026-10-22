import * as RadixRadioGroup from "@radix-ui/react-radio-group";
import { cn } from "@utils/helpers";
import * as React from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
};

export const RadioGroup = ({ value, onChange, children }: Props) => {
  return (
    <RadixRadioGroup.Root
      value={value}
      onValueChange={onChange}
      className={
        "flex bg-neutral-100 dark:bg-nb-gray-900 rounded-md border border-nb-gray-700 text-sm items-center justify-center p-1"
      }
    >
      {children}
    </RadixRadioGroup.Root>
  );
};
export const RadioGroupItems = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <div className={"flex w-full bg-neutral-100 dark:bg-nb-gray-900"}>{children}</div>;
};

export const RadioGroupItem = ({
  value,
  children,
  variant = "default",
}: {
  value: string;
  children?: React.ReactNode;
  variant?: "default" | "red" | "green";
}) => {
  return (
    <RadixRadioGroup.Item value={value} asChild={true}>
      <div
        key={value}
        className={cn(
          variant === "default" &&
            "data-[state=checked]:bg-white data-[state=checked]:text-neutral-900 data-[state=checked]:shadow-sm dark:data-[state=checked]:bg-nb-gray-600 dark:data-[state=checked]:text-nb-gray-100 dark:data-[state=checked]:shadow-none",
          variant === "red" &&
            "data-[state=checked]:bg-red-100 data-[state=checked]:text-red-700 dark:data-[state=checked]:bg-red-800 dark:data-[state=checked]:text-red-200",
          variant === "green" &&
            "data-[state=checked]:bg-green-100 data-[state=checked]:text-green-700 dark:data-[state=checked]:bg-green-800 dark:data-[state=checked]:text-green-200",
          "text-neutral-600 hover:text-neutral-900 dark:text-nb-gray-500 dark:hover:text-nb-gray-400",
          "cursor-pointer relative transition-all w-full py-1.5 px-5 rounded-md h-full flex items-center text-sm gap-1 text-center justify-center",
        )}
      >
        {children ? children : <div className={"h-3"}></div>}
      </div>
    </RadixRadioGroup.Item>
  );
};
