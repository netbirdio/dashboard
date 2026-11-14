import { formatSessionSpan } from "@utils/helpers";
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

/**
 * Reads meta.session_duration, which Management sends as whole seconds in a
 * string and only when it knows them. Missing or invalid values give undefined.
 */
export function sessionSeconds(
  meta: ActivityEvent["meta"] | undefined,
): number | undefined {
  const raw: unknown = meta?.session_duration;
  if (raw === undefined || raw === null || raw === "") return undefined;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

/** Formats a session length in seconds as "45s", "12m 3s", "1h 2m" or "2d 3h". */
export function formatSessionSeconds(seconds: number | undefined): string {
  if (seconds === undefined) return "";
  return seconds === 0 ? "0s" : formatSessionSpan(seconds * 1000);
}

export function sessionDurationText(
  meta: ActivityEvent["meta"] | undefined,
): string {
  return formatSessionSeconds(sessionSeconds(meta));
}
