import {
  MemoizedScrollArea,
  MemoizedScrollAreaViewport,
} from "@components/ScrollArea";
import { cn } from "@utils/helpers";
import * as React from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";

type Props<T extends { id?: string }> = {
  items: T[];
  onSelect: (item: T) => void;
  renderItem?: (item: T, selected?: boolean) => React.ReactNode;
  renderBeforeItem?: (item: T) => React.ReactNode;
  itemClassName?: string;
  itemWrapperClassName?: string;
  scrollAreaClassName?: string;
  maxHeight?: number;
  estimatedItemHeight?: number;
};

export function VirtualScrollAreaList<T extends { id?: string }>({
  items,
  onSelect,
  renderItem,
  renderBeforeItem,
  itemClassName,
  itemWrapperClassName,
  scrollAreaClassName,
  maxHeight,
  estimatedItemHeight = 36,
}: Readonly<Props<T>>) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
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
    window.addEventListener("keydown", navigation);
    return () => {
      window.removeEventListener("keydown", navigation);
    };
  }, [navigation]);

  const renderMemoizedItem = useMemo(() => renderItem, [renderItem]);

  const scrollAreaHeight = { maxHeight: maxHeight ?? 195 };

  const virtuosoHeight = {
    height: Math.min(items.length * estimatedItemHeight + 8, maxHeight ?? 195),
  };

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
        totalCount={items.length}
        fixedItemHeight={estimatedItemHeight}
        computeItemKey={(index) => items[index].id as string}
        context={{ selected, setSelected, onClick: onSelect }}
        itemContent={(index, option, { selected, setSelected, onClick }) => {
          return (
            <div>
              {renderBeforeItem?.(option)}
              <VirtualScrollListItemWrapper
                onMouseEnter={() => setSelected(index)}
                id={option.id}
                onClick={() => onClick(option)}
                ariaSelected={selected === index}
                itemClassName={itemClassName}
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
          Scroller: MemoizedScrollAreaViewport,
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
        className={cn(
          "pr-3 pl-2 webkit-scroll group/list-item",
          isLast && "pb-2",
          className,
        )}
        onMouseEnter={onMouseEnter}
        onClick={onClick}
      >
        <div
          className={cn(
            "text-xs flex justify-between py-2 px-3 cursor-pointer items-center rounded-md",
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
