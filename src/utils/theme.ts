import { CustomFlowbiteTheme } from "flowbite-react";

export const netbirdTheme: CustomFlowbiteTheme = {
  navbar: {
    root: {
      base: "bg-white px-2 py-4 dark:border-gray-700 dark:bg-nb-gray/50 backdrop-blur-lg bg-gray-50 sm:px-6",
    },
  },
  dropdown: {
    floating: {
      divider: "my-1 h-px bg-gray-100 dark:bg-zinc-800",
      item: {
        base: "flex items-center justify-start py-2 px-4 text-sm text-gray-700 cursor-pointer w-full hover:bg-gray-100 focus:bg-gray-100 dark:text-gray-200 dark:hover:bg-zinc-800 focus:outline-none dark:hover:text-white dark:focus:bg-zinc-800 dark:focus:text-white",
      },
      style: {
        auto: "border border-gray-200 bg-white text-gray-900 dark:border-zinc-800/50 dark:bg-zinc-900 dark:text-white",
      },
    },
  },
};
