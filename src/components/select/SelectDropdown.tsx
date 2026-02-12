import Button, { ButtonVariants } from "@components/Button";
import { CommandItem } from "@components/Command";
import Paragraph from "@components/Paragraph";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { ScrollArea } from "@components/ScrollArea";
import { SelectDropdownSearchInput } from "@components/select/SelectDropdownSearchInput";
import { useDebounce } from "@hooks/useDebounce";
import useIsVisible from "@hooks/useIsVisible";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandList } from "cmdk";
import { isEmpty } from "lodash";
import { ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useElementSize } from "@/hooks/useElementSize";
import { DropdownInfoText } from "@components/DropdownInfoText";

export interface SelectOption {
  label: string | React.ReactNode;
  value: string;
  icon?: React.ComponentType<{
    size?: number;
    width?: number;
    country?: string;
  }>;
  renderItem?: () => React.ReactNode;
  searchValue?: string;
  className?: string;
  disabled?: boolean;
}

interface SelectDropdownProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  popoverWidth?: "auto" | "content" | number;
  popoverMinWidth?: number;
  options: SelectOption[];
  showSearch?: boolean;
  showValues?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  variant?: ButtonVariants["variant"];
  className?: string;
  size?: "xs" | "sm";
  children?: React.ReactNode;
  maxHeight?: number;
  triggerClassName?: string;
}

export function SelectDropdown({
  onChange,
  value,
  disabled = false,
  popoverWidth = "auto",
  popoverMinWidth,
  options,
  showSearch = false,
  showValues = false,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  isLoading = false,
  variant = "input",
  className,
  size = "sm",
  children,
  maxHeight,
  triggerClassName,
}: Readonly<SelectDropdownProps>) {
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();

  const toggle = (selectedValue: string) => {
    const isSelected = value == selectedValue;
    if (!isSelected) onChange?.(selectedValue);
    setTimeout(() => {
      setSearch("");
    }, 100);
    setOpen(false);
  };

  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  const searchRef = React.useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);

  const filteredItems = React.useMemo(() => {
    if (isEmpty(debouncedSearch)) return options;
    return options.filter((item) => {
      const value = item?.searchValue || `${item.label}${item.value}` || "";
      return value.toLowerCase().includes(debouncedSearch.toLowerCase());
    });
  }, [options, debouncedSearch]);

  const Loading = () => {
    return (
      <div className={"flex items-center gap-2"}>
        <Skeleton width={20} />
        <Skeleton width={100} />
      </div>
    );
  };

  const SelectedItem = () => {
    return (
      <div className={"flex items-center gap-2.5"}>
        {selected?.icon && <selected.icon size={14} width={14} />}
        <div
          className={cn(
            "flex flex-col text-sm font-medium",
            size === "xs" && "text-xs",
          )}
        >
          <span className={"text-nb-gray-200"}>{selected?.label}</span>
        </div>
      </div>
    );
  };

  const PlaceholderItem = () => {
    return (
      <div className={"flex items-center gap-2.5"}>
        <div
          className={cn(
            "flex flex-col text-sm font-medium",
            size === "xs" && "text-xs",
          )}
        >
          <span className={"text-nb-gray-200"}>{placeholder}</span>
        </div>
      </div>
    );
  };

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
      <PopoverTrigger
        asChild={!children}
        disabled={disabled || isLoading}
        className={triggerClassName}
      >
        {children ? (
          children
        ) : (
          <Button
            variant={variant}
            disabled={disabled || isLoading}
            ref={inputRef}
            className={cn("w-full focus:outline-none", className)}
          >
            <div className={"w-full flex justify-between items-center gap-2"}>
              {isLoading && <Loading />}
              {!isLoading && selected && <SelectedItem />}
              {!isLoading && !selected && <PlaceholderItem />}
              <div className={"pl-2"}>
                <ChevronsUpDown size={18} className={"shrink-0"} />
              </div>
            </div>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "p-0 shadow-sm shadow-nb-gray-950 focus:outline-none",
          popoverWidth !== "content" && "w-full",
        )}
        style={{
          width:
            popoverWidth === "content"
              ? "auto"
              : popoverWidth === "auto"
              ? width
              : popoverWidth,
          minWidth: popoverMinWidth,
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

            {filteredItems.length == 0 && (
              <DropdownInfoText className={"max-w-sm mx-auto px-4"}>
                There are no results matching your search. Please try a
                different search term.
              </DropdownInfoText>
            )}

            <ScrollArea
              className={cn(
                "overflow-y-auto flex flex-col gap-1 pl-2 pr-3",
                !showSearch && "pt-2",
              )}
              style={{
                maxHeight: maxHeight ?? 380,
              }}
            >
              <CommandGroup>
                <div className={"grid grid-cols-1 gap-1 pb-2 w-full"}>
                  {filteredItems.map((option) => (
                    <SelectDropdownItem
                      option={option}
                      toggle={toggle}
                      key={option.value}
                      showValue={showValues}
                      size={size}
                    />
                  ))}
                </div>
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const SelectDropdownItem = ({
  option,
  toggle,
  showValue = false,
  size = "sm",
}: {
  option: SelectOption;
  toggle: (value: string) => void;
  showValue?: boolean;
  size: "xs" | "sm";
}) => {
  const value = option.value || "" + option.label || "";
  const elementRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(elementRef);

  const [visible, setVisible] = useState(isVisible);

  useEffect(() => {
    if (isVisible && !visible) {
      setVisible(true);
    }
  }, [isVisible]);

  return (
    <div ref={elementRef} className={"transition-all w-full"}>
      {visible ? (
        <CommandItem
          value={option?.searchValue ?? value}
          ref={elementRef}
          className={"py-1 px-2 w-full"}
          onSelect={() => !option?.disabled && toggle(option.value)}
          onClick={(e) => e.preventDefault()}
          disabled={option?.disabled}
        >
          <div
            className={cn(
              "flex items-center gap-2.5 p-1 w-full",
              option?.className,
              option?.disabled && "cursor-not-allowed",
            )}
          >
            {option.icon && <option.icon size={14} width={14} />}
            {option?.renderItem && option.renderItem()}
            {!option?.renderItem && (
              <div
                className={cn(
                  "flex flex-col text-sm font-medium w-full",
                  size === "xs" && "text-xs",
                )}
              >
                <span className={"text-nb-gray-200"}>{option.label}</span>
              </div>
            )}
          </div>
          {showValue && (
            <div className={"flex items-center gap-2.5 p-1"}>
              <Paragraph
                className={cn("text-sm text-right", size === "xs" && "text-xs")}
              >
                {option.value}
              </Paragraph>
            </div>
          )}
        </CommandItem>
      ) : (
        <div className={"h-[35px] py-1 px-2"}></div>
      )}
    </div>
  );
};
