import { cn } from "@utils/helpers";
import Image from "next/image";
import * as React from "react";
import NetBirdLogoMark from "@/assets/netbird.svg";
import NetBirdLogoFull from "@/assets/netbird-full.svg";
import NetBirdLogoFullLight from "@/assets/netbird-full-light.svg";

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
      {/* Full wordmark — hidden on mobile screens when `mobile` is set.
          Inner images toggle by theme: dark-text variant in light mode,
          light-text variant in dark mode. */}
      <span className={cn("relative", mobile && "hidden md:block")}>
        <Image
          src={NetBirdLogoFullLight}
          height={sizes[size].desktop}
          alt={"NetBird Logo"}
          className={"block dark:hidden"}
        />
        <Image
          src={NetBirdLogoFull}
          height={sizes[size].desktop}
          alt={"NetBird Logo"}
          className={"hidden dark:block"}
        />
      </span>
      {mobile && (
        <Image
          src={NetBirdLogoMark}
          width={sizes[size].mobile}
          alt={"NetBird Logo"}
          className={cn("md:hidden ml-4")}
        />
      )}
    </>
  );
};
