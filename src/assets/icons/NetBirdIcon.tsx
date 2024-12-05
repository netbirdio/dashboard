import Image from "next/image";
import * as React from "react";
import { memo } from "react";
import NetBirdLogo from "@/assets/netbird.svg";

type Props = {
  size?: number;
  className?: string;
};
function NetBirdIcon({ size = 16, className }: Props) {
  return (
    <Image
      src={NetBirdLogo}
      alt={"Netbird Icon"}
      width={size}
      priority={true}
      className={className}
    />
  );
}

export default memo(NetBirdIcon);
