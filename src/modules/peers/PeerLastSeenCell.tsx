import { History } from "lucide-react";
import * as React from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { Peer } from "@/interfaces/Peer";
import LastTimeRow from "@/modules/common-table-rows/LastTimeRow";

type Props = {
  peer: Peer;
};
export default function PeerLastSeenCell({ peer }: Props) {
  const { t } = useTranslation();
  return !peer.connected ? (
    <LastTimeRow date={peer.last_seen} />
  ) : (
    <div
      className={
        "flex items-center whitespace-nowrap gap-2 dark:text-neutral-300 text-neutral-500 hover:text-neutral-100 transition-all py-2 px-3 rounded-md"
      }
    >
      <>
        <History size={14} />
        {t("just now")}
      </>
    </div>
  );
}
