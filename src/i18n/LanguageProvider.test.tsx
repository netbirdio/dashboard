import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React, { act, useState } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LanguageSettings from "@/modules/settings/LanguageSettings";
import {
  catalogs,
  createI18n,
  isLanguage,
  languages,
  languageStorageKey,
} from "./config";
import { LanguageProvider } from "./LanguageProvider";
import en from "./locales/en.json";
import { T, useTranslation } from "./useTranslation";

function Subject() {
  const [value, setValue] = useState("");
  const { t } = useTranslation();
  return (
    <>
      <LanguageSettings />
      <h2>
        <T>{"Peers"}</T>
      </h2>
      <input
        aria-label="User content"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button>{t("Save Changes")}</button>
    </>
  );
}

function mount() {
  return render(
    <LanguageProvider>
      <Subject />
    </LanguageProvider>,
  );
}

async function selectLanguage(label: string) {
  const trigger = screen.getByRole("button", {
    name: catalogs[
      isLanguage(document.documentElement.lang)
        ? document.documentElement.lang
        : "en"
    ].Language,
  });
  fireEvent.keyDown(trigger, { key: "Enter" });
  const item = await screen.findByRole("menuitemradio", { name: label });
  fireEvent.click(item);
  await waitFor(() => expect(document.activeElement).toBe(trigger));
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = "en";
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("dashboard language selection", () => {
  it("defaults to English even in a Russian browser", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("ru-RU");
    mount();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Peers");
    expect(document.documentElement.lang).toBe("en");
  });

  it("changes text without remounting forms, persists the selection, and switches back", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("User content"), {
      target: { value: "My server" },
    });
    await selectLanguage("Русский");
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Устройства",
    );
    expect(
      screen.getByRole("button", { name: "Сохранить изменения" }),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("User content") as HTMLInputElement).value,
    ).toBe("My server");
    expect(localStorage.getItem(languageStorageKey)).toBe("ru");
    expect(document.documentElement.lang).toBe("ru");
    await selectLanguage("English (US)");
    expect(localStorage.getItem(languageStorageKey)).toBe("en");
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
        "Peers",
      ),
    );
    expect(localStorage.getItem(languageStorageKey)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("restores the saved language after remounting", async () => {
    localStorage.setItem(languageStorageKey, "ru");
    const first = mount();
    await screen.findByRole("button", { name: "Язык" });
    first.unmount();
    mount();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Устройства",
    );
  });

  it("ignores unsupported saved languages", () => {
    localStorage.setItem(languageStorageKey, "xx");
    mount();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Peers");
  });

  it("continues to work when browser storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    mount();
    await selectLanguage("Русский");
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Устройства",
    );
    expect(document.documentElement.lang).toBe("ru");
  });

  it("synchronizes changes and resets from other tabs", async () => {
    mount();
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: languageStorageKey,
          newValue: "ru",
        }),
      );
    });
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Устройства",
    );
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: languageStorageKey,
          newValue: null,
        }),
      );
    });
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
        "Peers",
      ),
    );
  });

  it("renders English on the server even when a saved browser preference exists", () => {
    localStorage.setItem(languageStorageKey, "ru");
    const html = renderToString(
      <LanguageProvider>
        <T>{"Peers"}</T>
      </LanguageProvider>,
    );
    expect(html).toBe("Peers");
  });

  it("keeps language changes isolated between instances and falls back to English", async () => {
    const first = createI18n();
    const second = createI18n();
    first.addResource("en", "translation", "English only", "English fallback");
    await first.changeLanguage("ru");
    expect(first.t("English only")).toBe("English fallback");
    expect(second.language).toBe("en");
    expect(second.t("Peers")).toBe("Peers");
  });

  it.each(Object.entries(languages))(
    "switches to %s, restores it, and returns to English",
    async (code, label) => {
      if (!isLanguage(code)) throw new Error(`Unknown language: ${code}`);
      const view = mount();
      await selectLanguage(label);
      expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
        catalogs[code].Peers,
      );
      expect(document.documentElement.lang).toBe(code);
      expect(localStorage.getItem(languageStorageKey)).toBe(code);
      expect(
        screen.getByRole("button", { name: catalogs[code].Language })
          .textContent,
      ).toBe(label);
      view.unmount();
      mount();
      expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
        catalogs[code].Peers,
      );
      expect(document.documentElement.lang).toBe(code);
      await selectLanguage(languages.en);
      expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
        "Peers",
      );
      expect(document.documentElement.lang).toBe("en");
    },
  );

  it.each(Object.entries(catalogs))(
    "ships a complete %s catalog with valid interpolation",
    (_code, catalog) => {
      expect(Object.keys(catalog).sort()).toEqual(Object.keys(en).sort());
      for (const [key, value] of Object.entries(catalog)) {
        expect(value.trim(), key).not.toBe("");
        const placeholders = (text: string) =>
          [...text.matchAll(/{{(\w+)}}/g)].map((m) => m[1]).sort();
        // Localized pagination omits the English resource noun to avoid incorrect
        // grammatical cases; all numeric placeholders must still be present.
        expect(
          placeholders(value).filter((name) => name !== "kind"),
          key,
        ).toEqual(placeholders(key).filter((name) => name !== "kind"));
      }
    },
  );

  it("rejects unknown and inherited property names as languages", () => {
    for (const value of [
      null,
      undefined,
      "xx",
      "constructor",
      "toString",
      "__proto__",
    ]) {
      expect(isLanguage(value)).toBe(false);
    }
  });
});
