import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { OperatingSystem } from "@/interfaces/OperatingSystem";

/**
 * Check if the NetBird SSH server can run on the peer's operating system.
 * The client ships it everywhere except iOS.
 *
 * There is no equivalent for RDP: the server is not ours, so any operating
 * system may be running one.
 */
export const isSSHSupportedOnOS = (os?: string) =>
  getOperatingSystem(os ?? "") !== OperatingSystem.IOS;

const VNC_SUPPORTED_OS = new Set([
  OperatingSystem.LINUX,
  OperatingSystem.WINDOWS,
  OperatingSystem.APPLE,
  OperatingSystem.FREEBSD,
  OperatingSystem.ANDROID,
]);

/**
 * Check if the NetBird VNC server can run on the peer's operating system.
 * Listed rather than excluded, unlike SSH: the server needs a way to capture
 * the screen, which is a per-system piece of work rather than something the
 * client has everywhere.
 */
export const isVNCSupportedOnOS = (os?: string) =>
  VNC_SUPPORTED_OS.has(getOperatingSystem(os ?? ""));

/** Check if the peer is a handheld, which is shaped and driven differently. */
export const isMobileOS = (os?: string) => {
  const detected = getOperatingSystem(os ?? "");
  return detected === OperatingSystem.ANDROID || detected === OperatingSystem.IOS;
};

const NO_REPORTED_CURSOR = new Set([
  // Draws the cursor into the frames it captures, so asking for it again
  // would show the viewer two.
  OperatingSystem.APPLE,
  // Has no pointer to report in the first place.
  OperatingSystem.ANDROID,
]);

/**
 * Check if the host can report its cursor separately from the screen. Where it
 * cannot, the "show remote cursor" control has nothing to switch.
 */
export const hasReportedCursor = (os?: string) =>
  !NO_REPORTED_CURSOR.has(getOperatingSystem(os ?? ""));
