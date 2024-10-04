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

export function removeAllSpaces(str: string) {
  return str.replace(/\s/g, "");
}

export const generateColorFromString = (str: string) => {
  let hash = 0;
  str.split("").forEach((char) => {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  });
  let colour = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    colour += value.toString(16).padStart(2, "0");
  }
  return colour;
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const validator = {
  isValidDomain: (domain: string) => {
    const unicodeDomain =
      /^(?!.*\.\.)(?!.*\.$)(?!.*\s)(?:(?!-)(?!.*--)[a-zA-Z0-9\u00A1-\uFFFF-]{1,63}(?<!-)\.)+(?!-)(?!.*--)[a-zA-Z0-9\u00A1-\uFFFF-]{2,63}$/u;
    try {
      const minMaxChars = [1, 255];
      const isValidDomainLength =
        domain.length >= minMaxChars[0] && domain.length <= minMaxChars[1];
      const includesDot = domain.includes(".");
      const hasNoWhitespace = !domain.includes(" ");
      return (
        unicodeDomain.test(domain) &&
        includesDot &&
        hasNoWhitespace &&
        isValidDomainLength
      );
    } catch (e) {
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
