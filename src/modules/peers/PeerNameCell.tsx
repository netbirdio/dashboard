import { useRouter } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import { useUsers } from "@/contexts/UsersProvider";
import { Peer } from "@/interfaces/Peer";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";

type Props = {
  peer: Peer;
};
export default function PeerNameCell({ peer }: Props) {
  const { users } = useUsers();
  const router = useRouter();

  const userOfPeer = useMemo(() => {
    return users?.find((user) => user.id === peer.user_id);
  }, [users, peer.user_id]);

  return (
    <div
      className={
        "flex items-center min-w-[250px] max-w-[250px] gap-2 dark:text-neutral-300 text-neutral-500 hover:text-neutral-100 transition-all hover:bg-nb-gray-800/60 py-2 px-3 rounded-md cursor-pointer"
      }
      data-testid="peer-name-cell"
      onClick={() => router.push("/peer?id=" + peer.id)}
    >
      <ActiveInactiveRow active={peer.connected} text={peer.name}>
        <div className={"text-nb-gray-400 font-light"}>{userOfPeer?.email}</div>
      </ActiveInactiveRow>
    </div>
  );
}
