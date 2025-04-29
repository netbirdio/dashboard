import { History } from "lucide-react";
import * as React from "react";
import { Peer } from "@/interfaces/Peer";
import LastTimeRow from "@/modules/common-table-rows/LastTimeRow";

type Props = {
  peer: Peer;
};
export default function PeerLastSeenCell({ peer }: Props) {
  return !peer.connected ? (
    <LastTimeRow date={peer.last_seen} />
  ) : (
    <div
      className={
        "flex items-center whitespace-nowrap gap-2 dark:text-neutral-300 text-neutral-500 transition-all hover:bg-gray-300 hover:text-neutral-800 dark:hover:text-neutral-100 dark:hover:bg-nb-gray-800/60 py-2 px-3 rounded-md cursor-default"
      }
    >
      <>
        <History size={14} className={"hover:text-white"} />
        just now
      </>
    </div>
  );
}
