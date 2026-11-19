import {
  type MessageFormatElement,
  parse,
  TYPE,
} from "@formatjs/icu-messageformat-parser";
import type { AbstractIntlMessages } from "use-intl/core";
import { describe, expect, it } from "vitest";
import { defaultLocale, isLocale, localeIds, locales } from "./locales";
import { createTranslations, englishTranslations } from "./translate";

function flatten(
  messages: AbstractIntlMessages,
  prefix = "",
): [string, string][] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [[path, value]] : flatten(value, path);
  });
}

function signature(message: string) {
  const argumentsAndTags = new Set<string>();

  function visit(elements: MessageFormatElement[]) {
    for (const element of elements) {
      if (element.type === TYPE.literal || element.type === TYPE.pound)
        continue;
      if (element.type === TYPE.tag) {
        argumentsAndTags.add(`tag:${element.value}`);
        visit(element.children);
      } else {
        argumentsAndTags.add(`arg:${element.value}`);
        if (element.type === TYPE.plural || element.type === TYPE.select) {
          for (const option of Object.values(element.options))
            visit(option.value);
        }
      }
    }
  }

  visit(parse(message));
  return Array.from(argumentsAndTags).sort();
}

const sourceMessages = new Map(flatten(locales[defaultLocale].messages));

describe("Dashboard catalogs", () => {
  it("registers canonical locale IDs with safe lookup", () => {
    expect(Intl.getCanonicalLocales(localeIds)).toEqual(localeIds);
    expect(isLocale("zh-Hans")).toBe(true);
    expect(isLocale("zh-TW")).toBe(false);
    expect(isLocale("constructor")).toBe(false);
  });

  it("keeps Simplified Chinese complete for the migrated strings", () => {
    expect(
      flatten(locales["zh-Hans"].messages)
        .map(([key]) => key)
        .sort(),
    ).toEqual(Array.from(sourceMessages.keys()).sort());
  });

  it("keeps valid ICU messages and matching variables and rich text tags", () => {
    for (const locale of localeIds) {
      for (const [key, message] of flatten(locales[locale].messages)) {
        const original = sourceMessages.get(key);
        expect(
          original,
          `${locale} ${key} is registered in English`,
        ).toBeDefined();
        expect(message.trim(), `${locale} ${key} is not blank`).not.toBe("");
        expect(signature(message), `${locale} ${key} placeholders`).toEqual(
          signature(original!),
        );
      }
    }
  });

  it("falls back to English per message for a partial locale", () => {
    const t = createTranslations("fr", { common: { peers: "Pairs" } });
    expect(t("common.peers")).toBe("Pairs");
    expect(t("common.settings")).toBe("Settings");
    expect(t("routes.confirmDeleteTitle", { name: "office" })).toBe(
      "Delete 'office'?",
    );
  });

  it("keeps a network identifier in the translated toast and confirmation", () => {
    const locale = "zh-Hans";
    const t = createTranslations(locale, locales[locale].messages);
    expect(t("routeGroup.deleteTitle", { name: "office-west" })).toBe(
      "删除网络「office-west」",
    );
    expect(t("routeGroup.confirmDeleteTitle", { name: "office-west" })).toBe(
      "删除网络「office-west」？",
    );
    expect(
      englishTranslations("routeGroup.deleteTitle", { name: "office-west" }),
    ).toBe("Delete Network office-west");
  });

  it("localizes multiple selections and preserves text entered by users", () => {
    const t = createTranslations("zh-Hans", locales["zh-Hans"].messages);
    expect(t("tables.roleCount", { count: 2 })).toBe("2 个角色");
    expect(t("tables.removeFilter", { filter: "状态" })).toBe(
      "移除「状态」筛选条件",
    );
    expect(
      t("networks.resourceCreatedMessage", { name: "office {blue}" }),
    ).toBe("资源「office {blue}」已创建。");
    expect(t("users.creatingNamedInvite", { name: "Ava" })).toBe(
      "正在为「Ava」创建邀请链接…",
    );
  });
});
