import { redirect } from "next/navigation";

// User Devices and Servers are merged into a single /peers table with an
// in-page switch. Keep the old route as a redirect that opens the right tab.
export default function UserDevicesRedirect() {
  redirect("/peers?kind=users");
}
