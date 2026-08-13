import { describe, expect, it } from "vitest";
import { Redactor } from "./redaction";

describe("Redactor token displays", () => {
  it("keeps one token per resource across mints", () => {
    const r = new Redactor();
    const first = r.handle("peer", "peer-1", "build-01");
    const again = r.handle("peer", "peer-1", "build-01");
    expect(again).toBe(first);
    expect(r.restore(`${first} is up`)).toBe("build-01 is up");
  });

  it("upgrades a display that was only ever the id", () => {
    const r = new Redactor();
    // First sighting had no name to go on (a bare id in a nested field).
    const token = r.handle("peer", "69b666c4321c");
    expect(r.restore(token)).toBe("69b666c4321c");

    // A later call knows the name — same token, readable answer.
    expect(r.handle("peer", "69b666c4321c", "minecraft-host")).toBe(token);
    expect(r.restore(`points at ${token}`)).toBe("points at minecraft-host");
    expect(r.resolve(token)).toBe("69b666c4321c");
  });

  it("does not let a later id overwrite a real name", () => {
    const r = new Redactor();
    const token = r.handle("group", "g-1", "Build Servers");
    r.handle("group", "g-1");
    expect(r.restore(token)).toBe("Build Servers");
  });
});
