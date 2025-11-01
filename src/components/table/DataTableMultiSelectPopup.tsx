import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { IconX } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { AnimatePresence, motion } from "framer-motion";
import { MonitorSmartphoneIcon } from "lucide-react";
import * as React from "react";

type Props<T> = {
  selectedItems?: T[];
  label?: string;
  onCanceled?: () => void;
  rightSide?: React.ReactNode;
};

export function DataTableMultiSelectPopup<T>({
  onCanceled,
  label = "Peer(s) selected",
  selectedItems,
  rightSide,
}: Props<T>) {
  const count = selectedItems?.length || 0;
  return (
    <AnimatePresence>
      {count > 0 && (
        <div
          className={"fixed -bottom-16 z-50 w-full left-0 pointer-events-none"}
        >
          <motion.div
            exit={{
              y: 100,
            }}
          >
            <AnimatePresence>
              <motion.div
                animate={{ y: 0 }}
                initial={{ y: 100 }}
                exit={{ y: 100 }}
                transition={{
                  type: "spring",
                  stiffness: 270,
                  damping: 25,
                  duration: 0.35,
                }}
                className={cn(
                  "max-w-xl mx-auto border relative z-[50] bg-nb-gray-800 border-nb-gray-900 shadow-2xl border-b-0 overflow-hidden pointer-events-auto",
                  "rounded-t-lg",
                )}
              >
                <AnimatePresence mode={"popLayout"}>
                  <div
                    className={
                      "flex gap-2 items-center text-sm px-6 pt-3.5 pb-20 bg-nb-gray-920/90 text-nb-gray-200 justify-between"
                    }
                  >
                    <div className={"flex gap-2 items-center"}>
                      <MonitorSmartphoneIcon size={16} className={""} />
                      <span>
                        <span className={"font-medium text-white"}>
                          {count}
                        </span>{" "}
                        {label}
                      </span>
                    </div>
                    <div className={"flex gap-2 items-center"}>
                      {rightSide}
                      <FullTooltip
                        content={<span className={"text-xs"}>Cancel</span>}
                      >
                        <Button
                          onClick={onCanceled}
                          variant={"default-outline"}
                          size={"xs"}
                          className={"!h-9 !w-9"}
                        >
                          <IconX size={16} className={"shrink-0"} />
                        </Button>
                      </FullTooltip>
                    </div>
                  </div>
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
