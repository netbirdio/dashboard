import * as React from "react";
import { FcLinux } from "react-icons/fc";
import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

type Props = {};
export const LinuxIcon = (props: IconProps) => {
  return (
    <FcLinux
      {...iconProperties(props)}
      className={
        "text-white text-2xl grayscale grayscale brightness-[100%] contrast-[40%]"
      }
    />
  );
};
