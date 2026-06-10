import * as React from "react";
import { Peer } from "@/interfaces/Peer";

type Props = {
  peer: Peer;
};

// Approval state moved to:
//   • PeerIssueIcon (warning icon in the peer name cell)
//   • PeerActionCell (Approve menu item)
// Kept as a no-op so the existing "status" column slot still renders.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function PeerStatusCell(_: Props) {
  return null;
}
