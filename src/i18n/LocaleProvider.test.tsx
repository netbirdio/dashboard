import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, useDashboardLocale } from "./LocaleProvider";
import { localeStorageKey } from "./locales";

function Fixture() {
  const { setLocale, t } = useDashboardLocale();
  return (
    <>
      <h1>{t("common.peers")}</h1>
      <input aria-label="Draft" />
      <button onClick={() => setLocale("zh-Hans")}>Chinese</button>
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("Dashboard locale preference", () => {
  it("updates mounted content, preserves the input and restores the locale", () => {
    const first = render(
      <LocaleProvider>
        <Fixture />
      </LocaleProvider>,
    );
    expect(screen.getByRole("heading").textContent).toBe("Peers");

    const input = screen.getByRole<HTMLInputElement>("textbox", {
      name: "Draft",
    });
    fireEvent.change(input, { target: { value: "unsaved" } });
    fireEvent.click(screen.getByRole("button", { name: "Chinese" }));

    expect(screen.getByRole("heading").textContent).toBe("节点");
    expect(document.documentElement.lang).toBe("zh-Hans");
    expect(screen.getByRole("textbox", { name: "Draft" })).toBe(input);
    expect(input.value).toBe("unsaved");
    expect(localStorage.getItem(localeStorageKey)).toBe("zh-Hans");

    first.unmount();
    render(
      <LocaleProvider>
        <Fixture />
      </LocaleProvider>,
    );
    expect(screen.getByRole("heading").textContent).toBe("节点");
  });

  it("updates from another tab and rejects unknown saved locales", () => {
    localStorage.setItem(localeStorageKey, "zh-TW");
    render(
      <LocaleProvider>
        <Fixture />
      </LocaleProvider>,
    );
    expect(screen.getByRole("heading").textContent).toBe("Peers");

    act(() => {
      localStorage.setItem(localeStorageKey, "zh-Hans");
      window.dispatchEvent(
        new StorageEvent("storage", {
          storageArea: localStorage,
          key: localeStorageKey,
          newValue: "zh-Hans",
        }),
      );
    });

    expect(screen.getByRole("heading").textContent).toBe("节点");
  });

  it("switches even when local storage cannot be written", () => {
    render(
      <LocaleProvider>
        <Fixture />
      </LocaleProvider>,
    );
    const write = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("Storage unavailable", "QuotaExceededError");
      });

    fireEvent.click(screen.getByRole("button", { name: "Chinese" }));
    expect(screen.getByRole("heading").textContent).toBe("节点");

    write.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "Chinese" }));
    expect(localStorage.getItem(localeStorageKey)).toBe("zh-Hans");
  });
});
