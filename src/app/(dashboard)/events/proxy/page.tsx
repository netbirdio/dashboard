import { redirect } from "next/navigation";

export default function ProxyEventsPage() {
  redirect("/reverse-proxy/logs");
}
