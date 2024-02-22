import { cn } from "@utils/helpers";
import Image from "next/image";
import * as React from "react";
import { FaWindows } from "react-icons/fa6";
import { CountryDERounded } from "@/assets/countries/CountryDERounded";
import { CountryUSRounded } from "@/assets/countries/CountryUSRounded";
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
          <CountryDERounded />
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
          <CountryUSRounded />
        </div>
      </Circle>
      <Circle className={"z-[1] top-2 "}>
        <FaWindows className={"text-white text-md"} />
      </Circle>
    </div>
  );
};

const Circle = ({ children, className }: Props) => {
  return (
    <div
      className={cn(
        "h-10 w-10 rounded-full bg-nb-gray-900 flex items-center justify-center relative border-2 border-nb-gray",
        className,
      )}
    >
      {children}
    </div>
  );
};
