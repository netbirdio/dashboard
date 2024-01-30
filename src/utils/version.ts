import dayjs from "dayjs";
import { NetbirdRelease } from "@/interfaces/Version";

const GITHUB_API_ENDPOINT = "https://api.github.com";
const LATEST_RELEASE_CHECK_INTERVAL_IN_MINUTES = 10;

export const getLatestNetbirdRelease = async (
  release?: NetbirdRelease,
): Promise<NetbirdRelease | undefined> => {
  const runFetch =
    release === undefined ||
    release.last_checked === undefined ||
    dayjs(release.last_checked).isBefore(
      dayjs().subtract(LATEST_RELEASE_CHECK_INTERVAL_IN_MINUTES, "minute"),
    );

  if (runFetch) {
    const data = (await fetch(
      `${GITHUB_API_ENDPOINT}/repos/netbirdio/netbird/releases/latest`,
    ).then((response) => response.json())) as any;

    try {
      return {
        latest_version: data.name,
        last_checked: new Date(),
        url: data.html_url as string,
      } as NetbirdRelease;
    } catch (e) {
      console.warn(e);
      return undefined;
    }
  } else {
    return release;
  }
};

export const parseVersionString = (version: string | undefined) => {
  if (!version) return -1;
  return parseInt(version.replace(/\D/g, ""));
};
