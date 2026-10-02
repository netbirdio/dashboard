import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { describe, expect, it } from "vitest";
import { catalogs, isLanguage, languages } from "./config";
import { dateLocale } from "./dateLocale";

dayjs.extend(relativeTime);

describe("localized dates", () => {
  it.each(Object.keys(languages))(
    "formats relative time in %s without changing the global locale",
    (code) => {
      if (!isLanguage(code)) throw new Error(`Unknown language: ${code}`);
      const globalLocale = dayjs.locale();
      const start = dayjs("2026-01-02T12:00:00");
      const localized = start.locale(dateLocale(code));
      expect(localized.locale()).toBe(code.toLowerCase());
      const relative = localized.to(start.add(5, "minutes"));
      if (code === "en") expect(relative).toBe("in 5 minutes");
      else expect(relative).not.toBe("in 5 minutes");
      const formatted = localized.format(
        catalogs[code]["D MMMM, YYYY [at] h:mm A"],
      );
      expect(formatted).toContain("2026");
      expect(formatted).toContain("12:00");
      expect(formatted).not.toMatch(/YYYY|MMMM|HH|Invalid/);
      expect(dayjs.locale()).toBe(globalLocale);
    },
  );

  it("uses English for an unsupported date locale", () => {
    expect(dateLocale("xx")).toBe("en");
    expect(dateLocale(undefined)).toBe("en");
  });
});
