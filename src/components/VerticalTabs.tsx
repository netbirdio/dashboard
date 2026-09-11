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
  const scroller = React.useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = React.useState({
    start: false,
    end: false,
  });

  // Below lg the list is a horizontal strip with its scrollbar hidden, so
  // nothing says the tabs continue past the edge. These flags drive a fade at
  // whichever end still has tabs behind it.
  React.useEffect(() => {
    const el = scroller.current;
    if (!el) return;

    const measure = () => {
      const max = el.scrollWidth - el.clientWidth;
      const start = el.scrollLeft > 1;
      const end = el.scrollLeft < max - 1;
      // Same object back when nothing moved, so a measure triggered by our own
      // render cannot start a loop.
      setOverflows((prev) =>
        prev.start === start && prev.end === end ? prev : { start, end },
      );
    };

    // ResizeObserver fires once on observe, which covers the initial state
    // without calling setState straight from the effect body.
    const resize = new ResizeObserver(measure);
    resize.observe(el);

    // Triggers are permission-gated, so one appearing later changes scrollWidth
    // without resizing the element, which a ResizeObserver alone would miss.
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
    "absolute inset-y-0 w-10 pointer-events-none transition-opacity lg:hidden";

  return (
    // lg:contents so the list itself stays the flex item on desktop and this
    // wrapper only exists for the fades.
    <div className={"relative min-w-0 lg:contents"}>
      <Tabs.List
        ref={scroller}
        className={cn(
          "px-4 py-4 whitespace-nowrap overflow-y-hidden shrink-0 no-scrollbar",
          "lg:h-full items-start bg-nb-gray border-b-0 border-nb-gray-930",
          "flex lg:flex-col lg:gap-1",
          // PageContainer is the scroll container, so without this the tab list
          // scrolls away with the tab content. Pinned to the top of it instead,
          // and given its own overflow so a list taller than the viewport can
          // still be reached rather than being clipped by overflow-y-hidden.
          "lg:sticky lg:top-0 lg:overflow-y-auto",
        )}
        style={{
          height: isLg ? "calc(100vh - 75px)" : "auto",
        }}
      >
        {children}
      </Tabs.List>

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
    </div>
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
