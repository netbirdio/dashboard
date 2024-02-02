import Image from "next/image";
import * as React from "react";
import { FaWindows } from "react-icons/fa6";
import { CountryDERounded } from "@/assets/countries/CountryDERounded";
import { CountryUSRounded } from "@/assets/countries/CountryUSRounded";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import AppleLogo from "@/assets/os-icons/apple.svg";

type Props = {};
export const PostureCheckIcons = ({}: Props) => {
  return (
    <div className={"flex items-center justify-center"}>
      <div
        className={
          "h-10 w-10 rounded-full bg-nb-gray-900 flex items-center justify-center relative left-4 border-2 border-nb-gray top-2"
        }
      >
        <Image src={AppleLogo} alt={""} width={14} />
      </div>

      <div
        className={
          "h-10 w-10 rounded-full bg-nb-gray-900 flex items-center justify-center relative  left-2 border-2 border-nb-gray top-1"
        }
      >
        <div
          className={
            "h-6 w-6 overflow-hidden rounded-full flex items-center justify-center"
          }
        >
          <CountryDERounded />
        </div>
      </div>
      <div
        className={
          "h-10 w-10 rounded-full bg-nb-gray-900 flex items-center justify-center border-2 border-nb-gray z-[3]"
        }
      >
        <NetBirdIcon size={18} />
      </div>
      <div
        className={
          "h-10 w-10 rounded-full bg-nb-gray-900 flex items-center justify-center relative right-2 border-2 border-nb-gray z-[2] top-1"
        }
      >
        <div
          className={
            "h-6 w-6 overflow-hidden rounded-full flex items-center justify-center"
          }
        >
          <CountryUSRounded />
        </div>
      </div>
      <div
        className={
          "h-10 w-10 rounded-full bg-nb-gray-900 flex items-center justify-center relative  right-4 border-2 border-nb-gray z-[1] top-2"
        }
      >
        <FaWindows className={"text-white text-md"} />
      </div>
    </div>
  );
};
