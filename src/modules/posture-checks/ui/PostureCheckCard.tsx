import FullTooltip from "@components/FullTooltip";
import { Modal, ModalContent } from "@components/modal/Modal";
import { IconCircleFilled } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { ScaleIcon } from "lucide-react";
import * as React from "react";
import { useDialog } from "@/contexts/DialogProvider";

export const PostureCheckCard = ({
  children,
  title,
  description,
  icon,
  iconClass = "bg-gradient-to-tr from-netbird-200 to-netbird-100",
  modalWidthClass = "max-w-xl",
  onClose,
  open,
  setOpen,
  active,
  onReset,
  license,
}: {
  children?: React.ReactNode;
  title?: string;
  description?: string;
  iconClass?: string;
  icon?: React.ReactNode;
  modalWidthClass?: string;
  onClose?: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  onReset?: () => void;
  active?: boolean;
  license?: React.ReactNode;
}) => {
  const { confirm } = useDialog();

  const handleReset = async () => {
    const reset = await confirm({
      title: `Disable this check?`,
      description:
        "Are you sure you want to disable this check? All settings of this check will be lost.",
      confirmText: "Disable",
      cancelText: "Cancel",
      type: "danger",
    });
    if (reset) onReset?.();
  };

  const licenseToolTip = (
    <FullTooltip content={license}>
      <ScaleIcon
        size={14}
        className={
          "text-nb-gray-400 hover:text-nb-gray-200 transition-all cursor-pointer -top-[1px] relative"
        }
      />
    </FullTooltip>
  );

  return (
    <div className={"w-full"}>
      <div
        onClick={() => setOpen(true)}
        className={
          "hover:bg-nb-gray-920/80 border border-transparent hover:border-nb-gray-900 rounded-md flex flex-col items-center transition-all cursor-pointer w-full"
        }
      >
        <div className={"flex gap-4 items-center w-full px-4 py-3"}>
          <div
            className={cn(
              "h-9 w-9 shrink-0  shadow-xl  rounded-md flex items-center justify-center select-none",
              iconClass,
            )}
          >
            {icon}
          </div>
          <div className={" w-full"}>
            <div
              className={
                "text-sm font-medium flex gap-2 items-center justify-between"
              }
            >
              <span className={"flex items-center gap-2"}>
                {title}
                {license && licenseToolTip}
              </span>
            </div>
            <div className={"text-xs mt-0.5 text-nb-gray-300"}>
              {description}
            </div>
          </div>
          <div>
            <span
              className={cn(
                "text-[10px] rounded-full px-1 py-1 flex items-center gap-1 w-[50px] justify-center uppercase font-medium",
                active
                  ? "text-green-400 bg-green-900 hover:bg-green-800 transition-all hover:text-green-200"
                  : "text-nb-gray-400 bg-nb-gray-900",
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (active) handleReset().then();
                else setOpen(true);
              }}
            >
              <IconCircleFilled size={7} className={"mt-[0.1px]"} />
              {active ? "On" : "Off"}
            </span>
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onOpenChange={(open) => {
          setOpen(open);
          if (onClose && !open) {
            onClose();
          }
        }}
        key={open ? 1 : 0}
      >
        <ModalContent
          maxWidthClass={cn("relative", modalWidthClass)}
          showClose={true}
        >
          <div className={"flex gap-4 items-center px-8 pb-5"}>
            <div
              className={cn(
                "h-9 w-9 shrink-0  shadow-xl  rounded-md flex items-center justify-center select-none",
                iconClass,
              )}
            >
              {icon}
            </div>
            <div className={"pr-10"}>
              <div className={"text-sm font-medium flex gap-2 items-center"}>
                {title}
                {license && licenseToolTip}
              </div>
              <div className={"text-xs mt-0.5 text-nb-gray-300"}>
                {description}
              </div>
            </div>
          </div>

          {children}
        </ModalContent>
      </Modal>
    </div>
  );
};
