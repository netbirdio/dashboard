import { Input } from "@components/Input";
import Kbd from "@components/Kbd";
import { useDebounce } from "@hooks/useDebounce";
import { Search } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  setGlobalSearch: (value: string) => void;
  globalSearch?: string;
  className?: string;
  isLoading?: boolean;
  onClick?: () => void;
}

export default function DataTableGlobalSearch({
  setGlobalSearch,
  globalSearch,
  className = "min-w-[300px] max-w-[400px] grow",
  isLoading,
  onClick,
  ...props
}: Readonly<Props>) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(globalSearch || "");
  const debouncedValue = useDebounce(inputValue, 800);

  // Call setGlobalSearch when debounced value changes
  useEffect(() => {
    setGlobalSearch(debouncedValue);
  }, [debouncedValue]);

  useEffect(() => {
    if (globalSearch !== undefined && globalSearch !== inputValue) {
      setInputValue(globalSearch);
    }
  }, [globalSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  useHotkeys(
    "mod+k",
    () => {
      if (onClick) {
        onClick?.();
      } else {
        ref.current?.focus();
      }
    },
    [],
  );

  return (
    <Input
      {...props}
      ref={ref}
      onFocus={(e) => {
        if (onClick) {
          e.preventDefault();
          e.stopPropagation();
          onClick?.();
        }
      }}
      icon={<Search size={15} />}
      value={inputValue} // Shows immediate updates
      onChange={handleChange}
      maxWidthClass={className}
      customSuffix={<Kbd>⌘ K</Kbd>}
      disabled={false}
    />
  );
}
