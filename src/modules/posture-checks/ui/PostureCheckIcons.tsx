import { cn } from "@utils/helpers";
import Image from "next/image";
import * as React from "react";
import { FaWindows } from "react-icons/fa6";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import AppleLogo from "@/assets/os-icons/apple.svg";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export const PostureCheckIcons = () => {
  return (
    <div className={"flex items-center justify-center -space-x-2"}>
      <Circle className={"top-2"}>
        <Image src={AppleLogo} alt={""} width={14} />
      </Circle>
      <Circle className={"top-1"}>
        <div
          className={
            "h-6 w-6 overflow-hidden rounded-full flex items-center justify-center"
          }
        >
          <RoundedFlag country="de" />
        </div>
      </Circle>
      <Circle className={"z-[3]"}>
        <NetBirdIcon size={18} />
      </Circle>
      <Circle className={"top-1 z-[2]"}>
        <div
          className={
            "h-6 w-6 overflow-hidden rounded-full flex items-center justify-center"
          }
        >
          <RoundedFlag country="us" />
        </div>
      </Circle>
      <Circle className={"z-[1] top-2 "}>
        <FaWindows className={"text-gray-800 dark:text-white text-md"} />
      </Circle>
    </div>
  );
};

const Circle = ({ children, className }: Props) => {
  return (
    <div
      className={cn(
        "h-10 w-10 rounded-full bg-gray-100 dark:bg-nb-gray-900 flex items-center justify-center relative border-2 border-gray-300 dark:border-nb-gray",
        className,
      )}
    >
      {children}
    </div>
  );
};
