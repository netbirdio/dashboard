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
  renderItem?: (item: T) => React.ReactNode;
};

export function VirtualScrollAreaList<T extends { id?: string }>({
  items,
  onSelect,
  renderItem,
}: Props<T>) {
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

  return (
    <MemoizedScrollArea
      withoutViewport={true}
      className={"max-h-[195px] flex flex-col gap-1 py-2"}
    >
      <Virtuoso
        ref={virtuosoRef}
        overscan={50}
        data={items}
        computeItemKey={(index) => items[index].id as string}
        context={{ selected, setSelected, onClick: onSelect }}
        itemContent={(index, option, { selected, setSelected, onClick }) => {
          return (
            <VirtualScrollListItemWrapper
              onMouseEnter={() => setSelected(index)}
              id={option.id}
              onClick={() => onClick(option as T)}
              ariaSelected={selected === index}
            >
              {renderMemoizedItem ? renderMemoizedItem(option) : option.id}
            </VirtualScrollListItemWrapper>
          );
        }}
        style={{ height: 195 }}
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
};

export const VirtualScrollListItemWrapper = memo(
  ({ id, children, onClick, onMouseEnter, ariaSelected }: ItemWrapperProps) => {
    return (
      <div
        key={id ?? undefined}
        className={"pr-3 pl-2 webkit-scroll"}
        onMouseEnter={onMouseEnter}
        onClick={onClick}
      >
        <div
          className={cn(
            "text-xs flex justify-between py-2 px-3 cursor-pointer items-center rounded-md",
            "bg-transparent dark:aria-selected:bg-nb-gray-800/50",
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
