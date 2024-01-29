import Button from "@components/Button";
import { CommandItem } from "@components/Command";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { ScrollArea } from "@components/ScrollArea";
import { Command, CommandGroup, CommandList } from "cmdk";
import { trim } from "lodash";
import { ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useElementSize } from "@/hooks/useElementSize";

export interface SelectOption {
  label: string | React.ReactNode;
  value: string;
  icon?: React.ComponentType<{ size: number; width: number }>;
}

interface SelectDropdownProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  popoverWidth?: "auto" | number;
  options: SelectOption[];
}

export function SelectDropdown({
  onChange,
  value,
  disabled = false,
  popoverWidth = "auto",
  options,
}: SelectDropdownProps) {
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();

  const toggle = (selectedValue: string) => {
    const isSelected = value == selectedValue;
    if (isSelected) {
    } else {
      onChange && onChange(selectedValue);
    }
    setOpen(false);
  };

  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
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
            {selected && (
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
          filter={(value, search) => {
            const formatValue = trim(value.toLowerCase());
            const formatSearch = trim(search.toLowerCase());
            if (formatValue.includes(formatSearch)) return 1;
            return 0;
          }}
        >
          <CommandList className={"w-full"}>
            <ScrollArea
              className={
                "max-h-[380px] overflow-y-auto flex flex-col gap-1 pl-2 py-2 pr-3"
              }
            >
              <CommandGroup>
                <div className={"grid grid-cols-1 gap-1"}>
                  {options.map((option) => {
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
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
