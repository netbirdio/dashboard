import { cn } from "@utils/helpers";
import Image from "next/image";
import * as React from "react";
import NetBirdLogoMark from "@/assets/netbird.svg";
import NetBirdLogoFull from "@/assets/netbird-full.svg";

type Props = {
  size?: "default" | "large";
  mobile?: boolean;
};

const sizes = {
  default: {
    desktop: 22,
    mobile: 30,
  },
  large: {
    desktop: 24,
    mobile: 40,
  },
};

export const NetBirdLogo = ({ size = "default", mobile = true }: Props) => {
  return (
    <>
      <Image
        src={NetBirdLogoFull}
        height={sizes[size].desktop}
        alt={"NetBird Logo"}
        className={cn(mobile && "hidden md:block")}
      />
      {mobile && (
        <Image
          src={NetBirdLogoMark}
          width={sizes[size].mobile}
          alt={"NetBird Logo"}
          className={cn(mobile && "md:hidden ml-4")}
        />
      )}
    </>
  );
};
