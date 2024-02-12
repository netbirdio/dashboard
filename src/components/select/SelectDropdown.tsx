import Button from "@components/Button";
import { CommandItem } from "@components/Command";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { ScrollArea } from "@components/ScrollArea";
import { SelectDropdownSearchInput } from "@components/select/SelectDropdownSearchInput";
import { useDebounce } from "@hooks/useDebounce";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandList } from "cmdk";
import { isEmpty } from "lodash";
import { ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { useElementSize } from "@/hooks/useElementSize";

export interface SelectOption {
  label: string | React.ReactNode;
  value: string;
  icon?: React.ComponentType<{
    size?: number;
    width?: number;
    country?: string;
  }>;
}

interface SelectDropdownProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  popoverWidth?: "auto" | number;
  options: SelectOption[];
  showSearch?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
}

export function SelectDropdown({
  onChange,
  value,
  disabled = false,
  popoverWidth = "auto",
  options,
  showSearch = false,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
}: SelectDropdownProps) {
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();

  const toggle = (selectedValue: string) => {
    const isSelected = value == selectedValue;
    if (isSelected) {
    } else {
      onChange && onChange(selectedValue);
    }
    setTimeout(() => {
      setSearch("");
    }, 100);
    setOpen(false);
  };

  const [open, setOpen] = useState(false);

  const [slice, setSlice] = useState(10);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        setSlice(options.length);
      }, 100);
    } else {
      setSlice(10);
    }
  }, [open, options]);

  const selected = options.find((o) => o.value === value);

  const searchRef = React.useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);

  const filteredItems = React.useMemo(() => {
    if (isEmpty(debouncedSearch)) return options;
    return options.filter((item) => {
      const value = `${item.label}${item.value}` || "";
      return value.toLowerCase().includes(debouncedSearch.toLowerCase());
    });
  }, [options, debouncedSearch]);

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setTimeout(() => {
            setSearch("");
          }, 100);
        }
        setOpen(isOpen);
      }}
    >
      <PopoverTrigger asChild={true}>
        <Button
          variant={"input"}
          disabled={disabled}
          ref={inputRef}
          className={"w-full"}
        >
          <div className={"w-full flex justify-between items-center gap-2"}>
            {selected ? (
              <React.Fragment>
                <div className={"flex items-center gap-2.5"}>
                  {selected?.icon && <selected.icon size={14} width={14} />}
                  <div className={"flex flex-col text-sm font-medium"}>
                    <span className={"text-nb-gray-200"}>
                      {selected?.label}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <div className={"flex items-center gap-2.5"}>
                  <div className={"flex flex-col text-sm font-medium"}>
                    <span className={"text-nb-gray-200"}>{placeholder}</span>
                  </div>
                </div>
              </React.Fragment>
            )}

            <div className={"pl-2"}>
              <ChevronsUpDown size={18} className={"shrink-0"} />
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0 shadow-sm  shadow-nb-gray-950"
        style={{
          width: popoverWidth === "auto" ? width : popoverWidth,
        }}
        align="start"
        side={"bottom"}
        sideOffset={10}
      >
        <Command
          className={"w-full flex"}
          loop
          filter={() => 0}
          shouldFilter={false}
        >
          <CommandList className={"w-full"}>
            {showSearch && (
              <SelectDropdownSearchInput
                search={search}
                setSearch={setSearch}
                ref={searchRef}
                placeholder={searchPlaceholder}
              />
            )}

            <ScrollArea
              className={cn(
                "max-h-[380px] overflow-y-auto flex flex-col gap-1 pl-2 pb-2 pr-3",
                !showSearch && "pt-2",
              )}
            >
              <CommandGroup>
                <div className={"grid grid-cols-1 gap-1"}>
                  {filteredItems.map((option) => {
                    const value = option.value || "" + option.label || "";
                    return (
                      <CommandItem
                        key={option.value}
                        value={value}
                        className={"py-1 px-2"}
                        onSelect={() => toggle(option.value)}
                        onClick={(e) => e.preventDefault()}
                      >
                        <div className={"flex items-center gap-2.5 p-1"}>
                          {option.icon && <option.icon size={14} width={14} />}
                          <div className={"flex flex-col text-sm font-medium"}>
                            <span className={"text-nb-gray-200"}>
                              {option.label}
                            </span>
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </div>
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
