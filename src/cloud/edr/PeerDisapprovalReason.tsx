import * as React from "react";
import { Peer } from "@/interfaces/Peer";

export const PeerDisapprovalReason = ({ peer }: { peer: Peer }) => {
  if (!peer?.disapproval_reason) return null;

  return (
    <div
      className={
        "text-[0.7rem] bg-nb-gray-910 py-2 px-4 font-mono border border-nb-gray-900 rounded-b-md"
      }
    >
      Reason: {peer?.disapproval_reason}
    </div>
  );
};
