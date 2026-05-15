import { redirect } from "next/navigation";

export default function PeersIndex() {
  redirect("/peers/users");
}
