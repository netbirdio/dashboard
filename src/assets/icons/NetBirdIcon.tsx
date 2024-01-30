import Image from "next/image";
import * as React from "react";
import { memo } from "react";
import NetBirdLogo from "@/assets/netbird.svg";

type Props = {
  size?: number;
};
function NetBirdIcon({ size = 16 }: Props) {
  return <Image src={NetBirdLogo} alt={"Netbird Icon"} width={size} />;
}

export default memo(NetBirdIcon);
