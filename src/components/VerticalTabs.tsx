import { ScrollArea, ScrollAreaViewport } from "@components/ScrollArea";
import { TabContext, useTabContext } from "@components/Tabs";
import * as Tabs from "@radix-ui/react-tabs";
import { TabsTrigger } from "@radix-ui/react-tabs";
import { cn } from "@utils/helpers";
import { useIsLg } from "@utils/responsive";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
};

const TabSwitchContext = React.createContext<{
  switchTab: (value: string) => void;
}>({
  switchTab: () => {},
});

export const useTabSwitchContext = () => {
  return React.useContext(TabSwitchContext);
};

function VerticalTabs({ value, onChange, children }: Props) {
  return (
    <TabContext.Provider value={value || ""}>
      <TabSwitchContext.Provider
        value={{
          switchTab: (value: string) => {
            onChange(value);
          },
        }}
      >
        <Tabs.Root
          orientation={"vertical"}
          className={"block lg:flex bg-nb-gray"}
          value={value}
          onValueChange={(value) => onChange(value)}
        >
          {children}
        </Tabs.Root>
      </TabSwitchContext.Provider>
    </TabContext.Provider>
  );
}

function List({ children }: { children: React.ReactNode }) {
  const isLg = useIsLg();
  const viewport = React.useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = React.useState({
    start: false,
    end: false,
  });

  // A fade at whichever end still has tabs behind it, on top of the scrollbar
  // rather than instead of it.
  React.useEffect(() => {
    const el = viewport.current;
    if (!el) return;

    const measure = () => {
      const max = el.scrollWidth - el.clientWidth;
      const start = el.scrollLeft > 1;
      const end = el.scrollLeft < max - 1;
      setOverflows((prev) =>
        prev.start === start && prev.end === end ? prev : { start, end },
      );
    };

    // ResizeObserver fires once on observe, which covers the initial state
    // without calling setState straight from the effect body.
    const resize = new ResizeObserver(measure);
    resize.observe(el);

    // A permission-gated trigger appearing later changes scrollWidth without
    // resizing the element, which a ResizeObserver alone would miss.
    const mutation = new MutationObserver(measure);
    mutation.observe(el, { childList: true, subtree: true });

    el.addEventListener("scroll", measure, { passive: true });

    return () => {
      resize.disconnect();
      mutation.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, []);

  const fade =
    "absolute top-0 bottom-2.5 w-16 pointer-events-none transition-opacity lg:hidden";

  return (
    <Tabs.List
      className={cn(
        "shrink-0 bg-nb-gray border-b-0 border-nb-gray-930",
        // PageContainer is the scroll container, so without this the tab list
        // scrolls away with the tab content. Pinned to the top of it instead,
        // and given its own overflow so a list taller than the viewport can
        // still be reached.
        "lg:h-full lg:sticky lg:top-0 lg:overflow-y-auto",
      )}
      style={{
        height: isLg ? "calc(100vh - 75px)" : "auto",
      }}
    >
      {/* Below lg the tabs are a horizontal strip, and ScrollArea gives it the
          same styled scrollbar the rest of the app uses. On lg the Root and
          Viewport are display:contents, so they leave the layout and the tab
          column sits directly in the list as before. */}
      <ScrollArea className={"w-full lg:contents"} withoutViewport>
        <ScrollAreaViewport ref={viewport} className={"lg:contents"}>
          {/* The padding belongs inside the scroll area: outside it, the
              scrollbar sits over the items, and the leading gap does not
              travel with the content. */}
          <div
            className={cn(
              "flex flex-nowrap gap-[1px] whitespace-nowrap items-start",
              "px-4 pt-4 pb-3 lg:p-4 lg:flex-col lg:gap-1",
            )}
          >
            {children}
          </div>
        </ScrollAreaViewport>

        <div
          aria-hidden
          className={cn(
            fade,
            "left-0 bg-gradient-to-r from-nb-gray to-transparent",
            overflows.start ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          aria-hidden
          className={cn(
            fade,
            "right-0 bg-gradient-to-l from-nb-gray to-transparent",
            overflows.end ? "opacity-100" : "opacity-0",
          )}
        />
      </ScrollArea>
    </Tabs.List>
  );
}

function Trigger({
  children,
  value,
  disabled = false,
  "data-testid": dataTestId,
}: {
  children: React.ReactNode;
  value: string;
  disabled?: boolean;
  "data-testid"?: string;
}) {
  const currentValue = useTabContext();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <TabsTrigger
      data-settings-tab={value}
      disabled={disabled}
      data-testid={dataTestId}
      className={cn(
        "py-2 text-base rounded-md w-full transition-all data-[disabled]:opacity-10",
        "lg:pl-6 lg:pr-8 pl-4 pr-4 text-center lg:text-left",
        value == currentValue
          ? "bg-nb-gray-920"
          : disabled
          ? ""
          : "text-nb-gray-500 hover:bg-nb-gray-900/50",
      )}
      value={value}
      onClick={() => {
        router.push(pathname + `?tab=${value}`, {
          scroll: false,
        });
      }}
    >
      <div
        className={
          "flex items-center w-full justify-center lg:justify-start gap-2.5"
        }
      >
        {children}
      </div>
    </TabsTrigger>
  );
}

VerticalTabs.Trigger = Trigger;
VerticalTabs.List = List;

export { VerticalTabs };
