import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";

export const HoverModalCard = ({
  value,
  children,
  title,
  description,
  icon,
  iconClass = "bg-gradient-to-tr from-netbird-200 to-netbird-100",
  modalWidthClass = "max-w-xl",
}: {
  value: string;
  children?: React.ReactNode;
  title?: string;
  description?: string;
  iconClass?: string;
  icon?: React.ReactNode;
  modalWidthClass?: string;
}) => {
  const [open, setOpen] = useState(false);

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
          <div className={"pr-10"}>
            <div className={"text-sm font-medium flex gap-2 items-center"}>
              {title}
            </div>
            <div className={"text-xs mt-0.5 text-nb-gray-300"}>
              {description}
            </div>
          </div>
          <div className={"ml-auto flex gap-2 items-center "}></div>
        </div>
      </div>

      <Modal open={open} onOpenChange={setOpen}>
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

          <div className={"pb-6"}>{children}</div>
          <ModalFooter className={"items-center"}>
            <div className={"w-full"}>
              <Paragraph className={"text-sm mt-auto"}>
                Learn more about
                <InlineLink
                  href={
                    "https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
                  }
                  target={"_blank"}
                >
                  Posture Checks
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </Paragraph>
            </div>
            <div className={"flex gap-3 w-full justify-end"}>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>Cancel</Button>
              </ModalClose>

              <Button variant={"primary"}>Save</Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
