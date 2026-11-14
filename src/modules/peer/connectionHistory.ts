import type { ActivityEvent } from "@/interfaces/ActivityEvent";
import type { Country } from "@/interfaces/Country";

function isPeerConnectionEvent(event: ActivityEvent): boolean {
  return (
    event.activity_code === "peer.connect" ||
    event.activity_code === "peer.disconnect"
  );
}

export function peerConnectionEvents(
  events: ActivityEvent[],
  peerID: string,
): ActivityEvent[] {
  return events.filter(
    (event) => event.target_id === peerID && isPeerConnectionEvent(event),
  );
}

/**
 * Describes where a connection came from, as "Country, City". Management only adds
 * location keys when they were resolved for the event's own source IP.
 */
export function connectionLocationText(
  meta: ActivityEvent["meta"] | undefined,
  countries: Country[] | undefined,
): string {
  const code: string | undefined = meta?.location_country_code;
  if (!code) return "";
  const country =
    countries?.find((c) => c.country_code === code)?.country_name ?? code;
  const city: string | undefined = meta?.location_city_name;
  return city ? `${country}, ${city}` : country;
}
