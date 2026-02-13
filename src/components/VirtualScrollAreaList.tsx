import { MemoizedScrollArea, ScrollAreaViewport } from "@components/ScrollArea";
import { cn } from "@utils/helpers";
import * as React from "react";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";

const VirtuosoScroller = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => <ScrollAreaViewport ref={ref} {...props} />);

type Props<T extends { id?: string }> = {
  items: T[];
  onSelect: (item: T) => void;
  renderItem?: (item: T, selected?: boolean) => React.ReactNode;
  renderHeading?: (item: T) => React.ReactNode;
  renderBeforeItem?: (item: T) => React.ReactNode;
  itemClassName?: string;
  itemClassNameWithItem?: (item: T) => string;
  itemWrapperClassName?: string;
  scrollAreaClassName?: string;
  maxHeight?: number;
  estimatedItemHeight?: number;
  estimatedHeadingHeight?: number;
  heightAdjustment?: number;
  groupKey?: (item: T) => string | undefined;
  itemKey?: (item: T) => string;
};

export function VirtualScrollAreaList<T extends { id?: string }>({
  items,
  onSelect,
  renderItem,
  renderBeforeItem,
  renderHeading,
  itemClassName,
  itemClassNameWithItem,
  itemWrapperClassName,
  scrollAreaClassName,
  maxHeight,
  estimatedItemHeight = 36,
  estimatedHeadingHeight = 16,
  heightAdjustment = 8,
  groupKey,
  itemKey,
}: Readonly<Props<T>>) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [lastInputMethod, setLastInputMethod] = useState<"mouse" | "keyboard">(
    "mouse",
  );
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    setSelected(0);
  }, [items]);

  const scrollToItem = useCallback((index: number) => {
    virtuosoRef.current?.scrollIntoView({
      index,
      behavior: "auto",
      align: "center",
    });
  }, []);

  const navigation = useCallback(
    (e: KeyboardEvent) => {
      setLastInputMethod("keyboard");
      if (items.length === 0) return;
      const length = items.length - 1;
      if (e.code === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        const newSelected = selected === 0 ? length : selected - 1;
        setSelected(newSelected);
        scrollToItem(newSelected);
      } else if (e.key === "ArrowDown" || e.key === "Tab") {
        e.preventDefault();
        const newSelected = selected === length ? 0 : selected + 1;
        setSelected(newSelected);
        scrollToItem(newSelected);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        onSelect?.(items[selected]);
      }
    },
    [items, scrollToItem, selected],
  );

  useEffect(() => {
    const handleMouse = () => setLastInputMethod("mouse");

    window.addEventListener("keydown", navigation);
    window.addEventListener("mousemove", handleMouse);
    return () => {
      window.removeEventListener("keydown", navigation);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, [navigation]);

  const headingCount = useMemo(() => {
    if (!groupKey) return 0;

    let count = 0;
    let prev: string | undefined;

    for (const item of items) {
      const key = groupKey(item);
      if (key !== prev) {
        count++;
        prev = key;
      }
    }

    return count;
  }, [items, groupKey]);

  const renderMemoizedItem = useMemo(() => renderItem, [renderItem]);

  const scrollAreaHeight = { maxHeight: maxHeight ?? 195 };

  const virtuosoHeight = {
    height: Math.min(
      items.length * estimatedItemHeight +
        headingCount * estimatedHeadingHeight +
        +(8 + heightAdjustment),
      maxHeight ?? 195,
    ),
  };

  const fixedItemHeight = useMemo(() => {
    if (!groupKey) return estimatedItemHeight;
    if (items.length === 0) return 0;
    const h = virtuosoHeight.height / items.length;
    if (isNaN(h)) return estimatedItemHeight;
    return h;
  }, [estimatedItemHeight, groupKey, items.length, virtuosoHeight.height]);

  return (
    <MemoizedScrollArea
      withoutViewport={true}
      className={cn("flex flex-col gap-1 pt-2", scrollAreaClassName)}
      style={scrollAreaHeight}
    >
      <Virtuoso
        ref={virtuosoRef}
        overscan={50}
        data={items}
        defaultItemHeight={fixedItemHeight}
        totalCount={items.length}
        computeItemKey={(index) => items[index].id as string}
        context={{ selected, setSelected, onClick: onSelect }}
        itemContent={(index, option, { selected, setSelected, onClick }) => {
          const group = groupKey?.(option);
          const prevGroup =
            index > 0 ? groupKey?.(items[index - 1]) : undefined;
          const showHeading = group && group !== prevGroup;

          return (
            <div>
              {showHeading && renderHeading?.(option)}
              {renderBeforeItem?.(option)}
              <VirtualScrollListItemWrapper
                onMouseEnter={() => {
                  if (lastInputMethod === "mouse") {
                    setSelected(index);
                  }
                }}
                id={itemKey ? itemKey(option) : option?.id}
                onClick={() => onClick(option)}
                ariaSelected={selected === index}
                itemClassName={
                  itemClassNameWithItem
                    ? itemClassNameWithItem(option)
                    : itemClassName
                }
                className={itemWrapperClassName}
                isLast={index === items.length - 1}
              >
                {renderMemoizedItem
                  ? renderMemoizedItem(option, selected === index)
                  : option.id}
              </VirtualScrollListItemWrapper>
            </div>
          );
        }}
        style={virtuosoHeight}
        components={{
          Scroller: VirtuosoScroller,
        }}
      />
    </MemoizedScrollArea>
  );
}

type ItemWrapperProps = {
  children: React.ReactNode;
  id?: string;
  onMouseEnter?: () => void;
  onClick?: () => void;
  ariaSelected?: boolean;
  className?: string;
  itemClassName?: string;
  isLast?: boolean;
};

export const VirtualScrollListItemWrapper = memo(
  ({
    id,
    children,
    onClick,
    onMouseEnter,
    ariaSelected,
    className,
    itemClassName,
    isLast,
  }: ItemWrapperProps) => {
    return (
      <div
        key={id ?? undefined}
        className={cn("pr-3 pl-2 webkit-scroll", isLast && "pb-2", className)}
        onMouseOver={onMouseEnter}
        onClick={onClick}
      >
        <div
          className={cn(
            "text-xs flex justify-between py-2 px-3 cursor-pointer items-center rounded-md group/list-item",
            "bg-transparent dark:aria-selected:bg-nb-gray-800/50",
            itemClassName,
          )}
          aria-selected={ariaSelected}
          role={"listitem"}
          tabIndex={0}
        >
          {children}
        </div>
      </div>
    );
  },
);
VirtualScrollListItemWrapper.displayName = "VirtualScrollListItemWrapper";
