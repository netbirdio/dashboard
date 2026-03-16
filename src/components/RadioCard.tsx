import * as RadioGroup from "@radix-ui/react-radio-group";
import { ReactNode } from "react"; // or replace with clsx or similar
import { cn } from "@/utils/helpers";

type Props = {
  value: string;
  title: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
};

export const RadioCard = ({
  value,
  title,
  description,
  className,
  icon,
  disabled,
}: Props) => {
  return (
    <RadioGroup.Item
      value={value}
      disabled={disabled}
      className={cn(
        "peer relative block cursor-pointer rounded-lg border border-nb-gray-900 bg-nb-gray-930/60 px-5 py-3 transition-all focus:outline-none",
        "data-[state=checked]:border-nb-gray-400 data-[state=checked]:bg-nb-gray-920",
        "outline-none focus:ring-0 focus:bg-nb-gray-930 focus:border-nb-gray-920",
        "hover:bg-nb-gray-930",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-nb-gray-930/60",
        className,
      )}
    >
      <div className="text-nb-gray-100 font-normal text-sm text-left gap-2 flex items-center">
        {icon}
        {title}
      </div>
      <div className="text-nb-gray-300 text-[0.8rem] text-left">
        {description}
      </div>
    </RadioGroup.Item>
  );
};

type RadioCardGroupProps = {
  value: string;
  onValueChange: (val: string) => void;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
};

export const RadioCardGroup = ({
  value,
  onValueChange,
  children,
  className,
  "aria-label": ariaLabel = "Options",
}: RadioCardGroupProps) => {
  return (
    <RadioGroup.Root
      className={cn("flex flex-col gap-2", className)}
      value={value}
      onValueChange={onValueChange}
      aria-label={ariaLabel}
    >
      {children}
    </RadioGroup.Root>
  );
};
