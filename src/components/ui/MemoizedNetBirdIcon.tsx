import * as React from "react";
import { memo } from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";

const MemoizedNetBirdIcon = () => {
  return <NetBirdIcon size={14} />;
};

export default memo(MemoizedNetBirdIcon);
