import { describe, expect, it } from "vitest";
import { isNetBirdVNCSupportedOnOS } from "./osSupport";

describe("isNetBirdVNCSupportedOnOS", () => {
  it.each(["Ubuntu 22.04", "Darwin 14.5", "Windows Server 2022", "FreeBSD 14"])(
    "offers NetBird's VNC server on %s",
    (os) => {
      expect(isNetBirdVNCSupportedOnOS(os)).toBe(true);
    },
  );

  // The client does not build the VNC server for these, so offering it would
  // send people to a connection that cannot work.
  it.each(["Android 14", "iOS 17"])(
    "does not offer NetBird's VNC server on %s",
    (os) => {
      expect(isNetBirdVNCSupportedOnOS(os)).toBe(false);
    },
  );
});
