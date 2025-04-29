import * as RadixRadioGroup from "@radix-ui/react-radio-group";
import { cn } from "@utils/helpers";
import * as React from "react";
import { useState } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
};

export const RadioGroup = ({ value, onChange, children }: Props) => {
  const [defaultValue] = useState(value);
  return (
    <RadixRadioGroup.Root
      defaultValue={defaultValue}
      value={value}
      onValueChange={onChange}
      className={
        "flex bg-gray-50 dark:bg-nb-gray-900 rounded-md border border-gray-300 dark:border-nb-gray-700 text-sm items-center justify-center p-1"
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
  return <div className={"flex w-full bg-white dark:bg-nb-gray-900"}>{children}</div>;
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
            "text-gray-600 dark:text-nb-gray-500 hover:text-gray-700 dark:hover:text-nb-gray-400 data-[state=checked]:bg-gray-200 dark:data-[state=checked]:bg-nb-gray-600 data-[state=checked]:text-gray-800 dark:data-[state=checked]:text-nb-gray-100",
          variant === "red" &&
            "text-red-500 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 data-[state=checked]:bg-red-100 dark:data-[state=checked]:bg-red-800 data-[state=checked]:text-red-600 dark:data-[state=checked]:text-red-200",
          variant === "green" &&
            "text-green-500 dark:text-green-500 hover:text-green-600 dark:hover:text-green-400 data-[state=checked]:bg-green-100 dark:data-[state=checked]:bg-green-800 data-[state=checked]:text-green-600 dark:data-[state=checked]:text-green-200",
          "cursor-pointer relative transition-all w-full py-1.5 px-5 rounded-md h-full flex items-center text-sm gap-1 text-center justify-center",
        )}
      >
        {children ? children : <div className={"h-3"}></div>}
      </div>
    </RadixRadioGroup.Item>
  );
};
