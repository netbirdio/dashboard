import chroma from "chroma-js";
import { type ClassValue, clsx } from "clsx";
import deepClone from "lodash/cloneDeep";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function randomString(min: number = 12, max: number = 24) {
  let text = "";
  const charset = "ab cd efghi jklmnopqrst uvwxyz01234567 89";
  const len = Math.floor(Math.random() * (max - min + 1) + max);
  for (let i = 0; i < len; i++)
    text += charset.charAt(Math.floor(Math.random() * charset.length));
  return text;
}

export function randomBoolean() {
  return Math.random() >= 0.5;
}

export function removeAllSpaces(str?: string) {
  if (!str) return "";
  return str.replace(/\s/g, "");
}

export const generateColorFromString = (str?: string) => {
  if (!str) return "#f68330";
  if (str.includes("System")) return "#808080";
  if (str.toLowerCase().startsWith("netbird")) return "#f68330";
  let hash = 0;
  str.split("").forEach((char) => {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  });
  let colour = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    colour += value.toString(16).padStart(2, "0");
  }
  return chroma(colour).saturate(2).luminance(0.4).hex();
};

export const generateColorFromUser = (user?: {
  id?: string;
  name?: string;
  email?: string;
}) => {
  if (user?.email === "NetBird") return "#9c9c9c";
  return user?.name
    ? chroma(generateColorFromString(user?.name || user?.id || "System User"))
        .saturate(2)
        .luminance(0.4)
        .hex()
    : "#9c9c9c";
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const validator = {
  isValidDomain: (
    domain: string,
    options?: {
      allowWildcard?: boolean;
      allowOnlyTld?: boolean;
      preventLeadingAndTrailingDots?: boolean;
    },
  ) => {
    const {
      allowWildcard = true,
      allowOnlyTld = true,
      preventLeadingAndTrailingDots = false,
    } = options || {
      allowWildcard: true,
      allowOnlyTld: true,
      preventLeadingAndTrailingDots: false,
    };

    try {
      const includesAtLeastOneDot = allowOnlyTld ? true : domain.includes(".");
      const hasWhitespace = domain.includes(" ");
      /**
       * Do not start or end with hyphen
       * Allow any Unicode character
       * Allow any Unicode number
       * Allow hyphen, dot and asterisks
       */
      const domainRegex = /^(?!-)[\p{L}\p{N}.*-]+(?<!-)$/u;
      const isValidUnicodeDomain = domainRegex.test(domain);

      if (
        preventLeadingAndTrailingDots &&
        (domain.startsWith(".") || domain.endsWith("."))
      ) {
        return false;
      }

      if (domain.length < 1 || domain.length > 255) {
        return false;
      }

      if (!allowWildcard && domain.includes("*")) {
        return false;
      }

      if (!allowWildcard && domain.startsWith("*.")) {
        return false;
      }
      if (allowWildcard && !domain.startsWith("*.") && domain.includes("*")) {
        return false;
      }
      if (!allowOnlyTld && domain.startsWith(".")) {
        return false;
      }
      return includesAtLeastOneDot && isValidUnicodeDomain && !hasWhitespace;
    } catch (error) {
      return false;
    }
  },
  isValidEmail: (email: string) => {
    const regExp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/i;
    try {
      return email.match(regExp);
    } catch (e) {
      return false;
    }
  },
  isValidUrl: (urlString: string) => {
    const urlPattern = new RegExp(
      "^(https?:\\/\\/)?" + // validate protocol
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|localhost|" + // validate domain name
        "((\\d{1,3}\\.){3}\\d{1,3}))" + // validate OR ip (v4) address
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // validate port and path
        "(\\?[;&a-z\\d%_.~+=-]*)?" + // validate query string
        "(\\#[-a-z\\d_]*)?$",
      "i",
    ); // validate fragment locator
    return urlPattern.test(urlString);
  },
  isValidVersion: (version: string) => {
    const semverRegex =
      /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    return semverRegex.test(version);
  },
  isValidUnixFilePath: (path: string) => {
    const endsWithSlash = path.endsWith("/");
    const unixPathRegex = /^\/(?:[^/]+\/)*[^/]+$/;
    const isValid = unixPathRegex.test(path);
    return isValid && !endsWithSlash;
  },
  isValidWindowsFilePath: (path: string) => {
    const endsWithBackSlash = path.endsWith("\\");
    const windowsPathRegex =
      /^[a-zA-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*$/;
    const isValid = windowsPathRegex.test(path);
    return isValid && !endsWithBackSlash;
  },
};

export function isInt(n: number) {
  return n % 1 === 0;
}

export function tryGetProcessNameFromPath(path: string) {
  try {
    const canSplitByForwardSlash = path.includes("/");
    const canSplitByBackSlash = path.includes("\\");
    const byForwardSlash = canSplitByForwardSlash
      ? path.split("/").pop()
      : undefined;
    const byBackSlash = canSplitByBackSlash
      ? path.split("\\").pop()
      : undefined;
    return byForwardSlash || byBackSlash || path;
  } catch (e) {
    return path;
  }
}

export function cloneDeep<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    try {
      return deepClone(obj);
    } catch (e) {
      return obj;
    }
  }
}

/**
 * Converts bytes to human-readable format (B, KB, MB, GB, TB)
 * @param bytes Number of bytes to convert
 * @param decimals Number of decimal places to show
 * @returns Formatted string with appropriate unit
 */
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  try {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (
      parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i]
    );
  } catch (e) {
    return "0 B";
  }
};
