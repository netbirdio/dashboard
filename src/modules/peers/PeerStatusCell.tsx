import * as React from "react";
import { Peer } from "@/interfaces/Peer";

type Props = {
  peer: Peer;
};

// Approval / compliance UI moved to:
//   • PeerIssueIcon (warning icon in the peer name cell)
//   • PeerActionCell (Approve / Bypass / Revoke Bypass menu items)
// Kept as a no-op cell so the existing "status" column slot still
// renders without breaking the column layout.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function PeerStatusCell(_: Props) {
  return null;
}