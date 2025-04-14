import { IconArrowBack } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { SearchIcon } from "lucide-react";
import * as React from "react";
import { Dispatch, forwardRef } from "react";

type Props = {
  search: string;
  setSearch: Dispatch<React.SetStateAction<string>>;
  placeholder?: string;
};

export const SelectDropdownSearchInput = forwardRef<HTMLInputElement, Props>(
  (
    {
      search,
      setSearch,
      placeholder = "Search for peers by name or ip...",
    }: Props,
    ref,
  ) => {
    return (
      <div className={"relative"}>
        <input
          className={cn(
            "min-h-[42px] w-full relative border-default items-center",
            "border-b-0 border-t-0 border-r-0 border-l-0",
            "bg-transparent text-sm outline-none focus-visible:outline-none ring-0 focus-visible:ring-0",
            "dark:placeholder:text-neutral-500 font-light placeholder:text-neutral-500 pl-10",
          )}
          ref={ref}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
              "flex items-center bg-gray-100 dark:bg-nb-gray-800 py-1 px-1.5 rounded-[4px] border border-gray-300 dark:border-nb-gray-500"
            }
          >
            <IconArrowBack size={10} />
          </div>
        </div>
      </div>
    );
  },
);

SelectDropdownSearchInput.displayName = "SelectDropdownSearchInput";
