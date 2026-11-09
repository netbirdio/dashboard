import { copyName } from "@utils/copyName";
import { describe, expect, it } from "vitest";

describe("copyName", () => {
  it("adds a copy suffix to a plain name", () => {
    expect(copyName("Devs to Servers")).toBe("Devs to Servers (copy)");
  });

  it("numbers the copy when the plain copy name is taken", () => {
    expect(
      copyName("Devs to Servers", [
        "Devs to Servers",
        "Devs to Servers (copy)",
      ]),
    ).toBe("Devs to Servers (copy 2)");
    expect(
      copyName("Devs to Servers", [
        "Devs to Servers (copy)",
        "Devs to Servers (copy 2)",
      ]),
    ).toBe("Devs to Servers (copy 3)");
  });

  it("copies a copy from the original name instead of stacking suffixes", () => {
    expect(copyName("Devs to Servers (copy)", ["Devs to Servers (copy)"])).toBe(
      "Devs to Servers (copy 2)",
    );
  });

  it("picks the first free suffix when copying a numbered copy", () => {
    expect(
      copyName("Devs to Servers (copy 3)", ["Devs to Servers (copy 3)"]),
    ).toBe("Devs to Servers (copy)");
  });

  it("leaves parentheses that are not a copy suffix alone", () => {
    expect(copyName("Devs (EU)")).toBe("Devs (EU) (copy)");
  });
});
