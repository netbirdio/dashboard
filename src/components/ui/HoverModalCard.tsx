import { Modal, ModalContent } from "@components/modal/Modal";
import { IconCircleFilled } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import * as React from "react";

export const HoverModalCard = ({
  value,
  children,
  title,
  description,
  icon,
  iconClass = "bg-gradient-to-tr from-netbird-200 to-netbird-100",
  modalWidthClass = "max-w-xl",
  onClose,
  onSave,
  open,
  setOpen,
  active,
}: {
  value: string;
  children?: React.ReactNode;
  title?: string;
  description?: string;
  iconClass?: string;
  icon?: React.ReactNode;
  modalWidthClass?: string;
  onClose?: () => void;
  onSave?: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  active?: boolean;
}) => {
  return (
    <div>
      <div
        onClick={() => setOpen(true)}
        className={
          "hover:bg-nb-gray-920/80 border border-transparent hover:border-nb-gray-900 rounded-md flex flex-col items-center transition-all cursor-pointer"
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
              <span> {title}</span>
            </div>
            <div className={"text-xs mt-0.5 text-nb-gray-300"}>
              {description}
            </div>
          </div>
          <span
            className={cn(
              "text-[10px] rounded-full px-2 py-0.5 flex items-center gap-1 w-[55px] justify-center uppercase font-medium",
              active
                ? "text-green-400 bg-green-900"
                : "text-nb-gray-400 bg-nb-gray-900",
            )}
          >
            <IconCircleFilled size={7} className={"mt-[0.1px]"} />
            {active ? "On" : "Off"}
          </span>
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
