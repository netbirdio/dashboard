import Button from "@components/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@components/Tooltip";
import { cn } from "@utils/helpers";
import { motion } from "framer-motion";
import { RefreshCcw } from "lucide-react";
import * as React from "react";
import { useState } from "react";

type Props = {
  onClick: () => void;
  isDisabled?: boolean;
};
export default function DataTableRefreshButton({ onClick, isDisabled }: Props) {
  const [rotate, setRotate] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [hovered, setHovered] = useState(false);

  const triggerRefresh = () => {
    setDisabled(true);
    setRotate(!rotate);
    onClick();
    setTimeout(() => {
      setDisabled(false);
    }, 5000);
  };

  return (
    <Tooltip delayDuration={1}>
      <TooltipTrigger
        asChild={true}
        onMouseOver={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => {
          e.preventDefault();
          !isDisabled && triggerRefresh();
        }}
      >
        <Button
          className={cn(
            "h-[42px]",
            // Override button styles for better contrast in light mode
            "bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-nb-gray-900/30 dark:text-gray-400 dark:hover:bg-zinc-800/50"
          )}
          variant={"secondary"}
          disabled={isDisabled == true ? true : disabled}
        >
          <motion.div
            key={rotate ? "rotate" : "no-rotate"}
            animate={{ rotate: -360 }}
            transition={{ duration: 0.8 }}
          >
            <RefreshCcw size={16} className="text-gray-700 dark:text-gray-300" />
          </motion.div>
        </Button>
      </TooltipTrigger>

      <TooltipContent
        sideOffset={10}
        className={"px-3 py-2"}
        onPointerDownOutside={(event) => {
          if (hovered) event.preventDefault();
        }}
      >
        <span className={"text-xs text-neutral-300"}>
          {disabled ? "You can refresh it again in 5 seconds" : "Refresh"}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
