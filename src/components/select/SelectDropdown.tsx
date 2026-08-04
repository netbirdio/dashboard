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
  // Optional section label. When any option carries a `group`, the
  // dropdown renders a header above each group and orders sections by
  // the first option that names them.
  group?: string;
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
  iconSize?: number;
  truncate?: boolean;
  compact?: boolean;
  // Pinned content below the scrollable options (e.g. a "create new" action)
  // — always visible regardless of scroll or search. Receives a callback
  // that closes the popover.
  footer?: (close: () => void) => React.ReactNode;
  // Optional controlled open state. When omitted the dropdown manages its own
  // (existing behaviour); when provided, the caller drives open/close — e.g.
  // to dismiss it on a click the Popover's own outside-detection can't see
  // (a ReactFlow pane that stops pointer propagation).
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Defer onChange until after the popover's close animation (~180ms). OFF by
  // default so ordinary dropdowns report synchronously (pre-existing behaviour);
  // the control center opts in because its onChange rebuilds the whole canvas
  // and janks if it fires mid-animation.
  deferChange?: boolean;
  "data-testid"?: string;
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
  iconSize = 14,
  truncate = false,
  compact = false,
  footer,
  open: controlledOpen,
  onOpenChange,
  deferChange = false,
  "data-testid": dataTestId,
}: Readonly<SelectDropdownProps>) {
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();

  const toggle = (selectedValue: string) => {
    const isSelected = value == selectedValue;
    setOpen(false);
    if (!isSelected) {
      // Fire after the close animation (see deferChange prop) so a heavy
      // onChange doesn't jank mid-animation; otherwise report synchronously.
      if (deferChange) setTimeout(() => onChange?.(selectedValue), 180);
      else onChange?.(selectedValue);
    }
    setTimeout(() => {
      setSearch("");
    }, 100);
  };

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = React.useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (controlledOpen === undefined) setUncontrolledOpen(next);
    },
    [controlledOpen, onOpenChange],
  );

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

  // When options carry a `group`, split them into ordered sections so a
  // header can render above each. Section order follows the first option
  // that names the group; empty groups (after search) drop out. Returns
  // null when no option is grouped so the flat render path is used.
  const groupedItems = React.useMemo(() => {
    if (!filteredItems.some((item) => item.group)) return null;
    const order: string[] = [];
    const byGroup = new Map<string, SelectOption[]>();
    for (const item of filteredItems) {
      const group = item.group ?? "";
      if (!byGroup.has(group)) {
        byGroup.set(group, []);
        order.push(group);
      }
      byGroup.get(group)?.push(item);
    }
    return order.map((group) => ({ group, items: byGroup.get(group) ?? [] }));
  }, [filteredItems]);

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
      <div className={cn("flex items-center gap-2.5", truncate && "min-w-0")}>
        {selected?.icon && <selected.icon size={iconSize} width={iconSize} />}
        <div
          className={cn(
            "flex flex-col text-sm font-medium",
            size === "xs" && "text-xs",
            truncate && "min-w-0",
          )}
        >
          <span className={cn("text-nb-gray-200", truncate && "truncate")}>
            {selected?.label}
          </span>
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
            data-testid={dataTestId}
          >
            <div className={"w-full flex justify-between items-center gap-2"}>
              {isLoading && <Loading />}
              {!isLoading && selected && <SelectedItem />}
              {!isLoading && !selected && <PlaceholderItem />}
              <div className={"pl-2"}>
                <ChevronsUpDown size={16} className={"shrink-0"} />
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
                "overflow-y-auto flex flex-col gap-1",
                compact ? "pl-1 pr-1" : "pl-2 pr-3",
                !showSearch && (compact ? "pt-1" : "pt-2"),
              )}
              style={{
                maxHeight: maxHeight ?? 380,
              }}
            >
              <CommandGroup>
                {groupedItems ? (
                  groupedItems.map(({ group, items }) => (
                    <div key={group || "_ungrouped"}>
                      {group && (
                        <div
                          className={cn(
                            "px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-nb-gray-400",
                            compact ? "pt-1" : "pt-2",
                          )}
                        >
                          {group}
                        </div>
                      )}
                      <div
                        className={cn(
                          "grid grid-cols-1 gap-1 w-full",
                          compact ? "pb-1" : "pb-2",
                        )}
                      >
                        {items.map((option) => (
                          <SelectDropdownItem
                            option={option}
                            toggle={toggle}
                            key={option.value}
                            iconSize={iconSize}
                            showValue={showValues}
                            size={size}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={cn("grid grid-cols-1 gap-1 w-full", compact ? "pb-1" : "pb-2")}>
                    {filteredItems.map((option) => (
                      <SelectDropdownItem
                        option={option}
                        toggle={toggle}
                        key={option.value}
                        iconSize={iconSize}
                        showValue={showValues}
                        size={size}
                      />
                    ))}
                  </div>
                )}
              </CommandGroup>
            </ScrollArea>
            {footer && (
              <div className={"border-t dark:border-nb-gray-800/70"}>
                {footer(() => setOpen(false))}
              </div>
            )}
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
  iconSize = 14,
}: {
  option: SelectOption;
  toggle: (value: string) => void;
  showValue?: boolean;
  size: "xs" | "sm";
  iconSize?: number;
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
            {option.icon && (
              <div className={"shrink-0"}>
                <option.icon size={iconSize} width={iconSize} />
              </div>
            )}

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
