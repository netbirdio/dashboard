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
