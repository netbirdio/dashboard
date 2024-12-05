import { IconArrowBack } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { SearchIcon } from "lucide-react";
import * as React from "react";
import { forwardRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export const DropdownInput = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, placeholder = "Search..." }, ref) => {
    return (
      <div className={"relative w-full"}>
        <input
          ref={ref}
          className={cn(
            "min-h-[42px] w-full relative",
            "border-b-0 border-t-0 border-r-0 border-l-0 border-neutral-200 dark:border-nb-gray-700 items-center",
            "bg-transparent text-sm outline-none focus-visible:outline-none ring-0 focus-visible:ring-0",
            "dark:placeholder:text-nb-gray-400 font-light placeholder:text-neutral-500 pl-10 select-none",
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <div className={"absolute left-0 top-0 h-full flex items-center pl-4"}>
          <div className={"flex items-center"}>
            <SearchIcon size={14} />
          </div>
        </div>
        <div className={"absolute right-0 top-0 h-full flex items-center pr-4"}>
          <div
            className={
              "flex items-center bg-nb-gray-800 py-1 px-1.5 rounded-[4px] border border-nb-gray-500"
            }
          >
            <IconArrowBack size={10} />
          </div>
        </div>
      </div>
    );
  },
);

DropdownInput.displayName = "DropdownInput";
