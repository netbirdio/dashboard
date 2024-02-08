import * as RadixRadioGroup from "@radix-ui/react-radio-group";
import { cn } from "@utils/helpers";
import { motion } from "framer-motion";
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
        "flex bg-nb-gray-900 rounded-md p-1 border border-nb-gray-700 text-sm items-center justify-center"
      }
    >
      {children}
    </RadixRadioGroup.Root>
  );
};

export const RadioGroupItem = ({
  value,
  children,
  variant = "default",
}: {
  value: string;
  children: React.ReactNode;
  variant?: "default" | "red" | "green";
}) => {
  return (
    <RadixRadioGroup.Item value={value} asChild={true}>
      <motion.div
        key={value}
        layoutId={"radio-group-item"}
        layout
        className={cn(
          variant === "default" &&
            "text-nb-gray-500 hover:text-nb-gray-400 data-[state=checked]:bg-nb-gray-600 data-[state=checked]:text-nb-gray-100",
          variant === "red" &&
            "text-nb-gray-500 hover:text-nb-gray-400 data-[state=checked]:bg-red-900 data-[state=checked]:text-red-200",
          variant === "green" &&
            "text-nb-gray-500 hover:text-nb-gray-400 data-[state=checked]:bg-green-900 data-[state=checked]:text-green-200",
          "cursor-pointer relative transition-all w-full py-1.5 px-5 rounded-md h-full flex items-center text-sm gap-1 text-center justify-center",
        )}
      >
        {children}
      </motion.div>
    </RadixRadioGroup.Item>
  );
};
