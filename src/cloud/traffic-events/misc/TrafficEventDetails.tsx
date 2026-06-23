import { Modal, SidebarModalContent } from "@components/modal/Modal";
import { cn } from "@utils/helpers";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, HashIcon } from "lucide-react";
import * as React from "react";
import { TrafficEventChart } from "@/cloud/traffic-events/misc/TrafficEventChart";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const TrafficEventDetails = ({ open, setOpen }: Props) => {
  return (
    <Modal open={open} onOpenChange={setOpen}>
      <SidebarModalContent
        maxWidthClass={"max-w-2xl"}
        showClose={true}
        className={"px-0 py-6 !bg-nb-gray-940"}
      >
        <div>
          <div className={"px-8 pb-6"}>
            <h1 className={"text-lg flex items-center gap-2"}>
              <HashIcon size={20} />
              NBSE2911929
            </h1>
          </div>
          <Separator />
          <div className={"px-10 pt-6 mt-4"}>
            <ul>
              <ListItem>
                Connection successfully established between Peer 1 and Peer 2
              </ListItem>
              <ListItem>Peer 2 accepted the connection request</ListItem>

              <ListItem>Posture Check XYZ passed</ListItem>
              <ListItem>Access Control Policy XYZ passed</ListItem>
              <ListItem hideLastLine={true}>
                Peer 1 requested to connect to Peer 2
              </ListItem>
            </ul>
          </div>
          <Separator />
          <div className={"px-8 pb-6 pt-2"}>
            <ExpandedCards />
          </div>
          <Separator />
          <div className={"px-8 py-6 "}>
            <div className={"grid grid-cols-3 gap-5"}></div>
          </div>
          <Separator />
          <div className={"px-8 py-6"}>
            <TrafficEventChart />
          </div>
        </div>
      </SidebarModalContent>
    </Modal>
  );
};

const ListItem = ({
  children,
  hideLastLine = false,
}: {
  children: React.ReactNode;
  hideLastLine?: boolean;
}) => {
  return (
    <li
      className={cn(
        "flex flex-col gap-2 items-start relative justify-center pl-6 pb-8 border-l-2 border-green-600",
        hideLastLine && "border-l-0",
      )}
    >
      <div
        className={cn(
          "w-[17px] h-[17px] bg-nb-gray-925 rounded-full flex items-center justify-center shrink-0",
          "bg-green-600 text-green-100",
          "absolute left-0 -ml-[9.5px] -top-[10px]",
        )}
      >
        <CheckIcon size={11} />
      </div>
      <div className={"flex flex-col gap-1 relative -top-2"}>
        <span className={"text-xs text-nb-gray-300"}>
          Th, 27 February 2025, 16:08
        </span>
        <span className={"text-sm font-normal"}>{children}</span>
      </div>
    </li>
  );
};

const Separator = () => {
  return <div className={"h-[1px] bg-zinc-700/60 w-full"}></div>;
};

const ExpandedCards = () => {
  return (
    <div className={"grid grid-cols-3 gap-4 mt-4"}>
      <div
        className={
          "flex flex-col bg-nb-gray-920 px-5 py-3.5 rounded-md border border-nb-gray-910"
        }
      >
        <span className={"text-xs tracking-wide text-nb-gray-300 mb-0.5"}>
          Duration
        </span>
        <span
          className={
            "text-sm font-medium text-nb-gray-200 flex items-center gap-2"
          }
        >
          {"< "}
          10 minutes
        </span>
      </div>
      <div
        className={
          "flex flex-col bg-nb-gray-920 px-5 py-3.5 rounded-md border border-nb-gray-910"
        }
      >
        <span className={"text-xs tracking-wide text-nb-gray-300 mb-0.5"}>
          Inbound Traffic
        </span>
        <span
          className={
            "text-sm font-medium text-nb-gray-200 flex items-center gap-2"
          }
        >
          <ArrowDownIcon size={16} className={"text-sky-400"} />
          15.2 GB
        </span>
      </div>
      <div
        className={
          "flex flex-col bg-nb-gray-920 px-5 py-3.5 rounded-md border border-nb-gray-910"
        }
      >
        <span
          className={"text-xs tracking-wide text-nb-gray-300 mb-0.5 flex gap-2"}
        >
          Outbound Traffic
        </span>
        <span
          className={
            "text-sm font-medium text-nb-gray-200 flex items-center gap-2"
          }
        >
          <ArrowUpIcon size={16} className={"text-netbird-500"} />
          10.8 GB
        </span>
      </div>
    </div>
  );
};
