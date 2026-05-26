import { redirect } from "next/navigation";

export default function SetupKeysIndex() {
  redirect("/settings?tab=setup-keys");
}