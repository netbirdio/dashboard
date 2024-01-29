import { Input } from "@components/Input";
import Kbd from "@components/Kbd";
import { Search } from "lucide-react";
import React from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  setGlobalSearch: (value: string) => void;
  globalSearch?: string;
  className?: string;
}

export default function DataTableGlobalSearch({
  setGlobalSearch,
  globalSearch,
  className = "min-w-[300px] max-w-[400px] grow",
  ...props
}: Props) {
  const ref = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalSearch(e.target.value);
  };

  useHotkeys("mod+k", () => ref.current?.focus(), []);

  return (
    <Input
      {...props}
      ref={ref}
      icon={<Search size={15} />}
      value={globalSearch}
      onChange={handleChange}
      maxWidthClass={className}
      customSuffix={<Kbd>⌘ K</Kbd>}
    />
  );
}
