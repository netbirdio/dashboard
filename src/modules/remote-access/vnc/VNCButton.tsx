import Button from "@components/Button";
import { DropdownMenuItem } from "@components/DropdownMenu";
import { CircleHelpIcon, ScreenShareIcon } from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Peer } from "@/interfaces/Peer";
import {
  isMobileOS,
  isNetBirdVNCSupportedOnOS,
} from "@/modules/remote-access/osSupport";
import { VNCTooltip } from "@/modules/remote-access/vnc/VNCTooltip";

type Props = {
  peer: Peer;
  isDropdown?: boolean;
};

/**
 * A window shaped roughly like what it will show. A phone is portrait, so the
 * default landscape window would letterbox its screen down to a strip between
 * two black margins. The peer's real dimensions are not known until the session
 * negotiates them, so this goes on the operating system.
 *
 * Not as narrow as a phone, though. The viewer's toolbar does not wrap and its
 * disconnected panels carry a sentence or two, so the window has to fit the
 * chrome as well as the screen. Letterboxing a little at the sides is the
 * cheaper of the two ways to be wrong.
 */
const viewerWindowSize = (os?: string) => {
  if (!isMobileOS(os)) {
    return { width: 1200, height: 800 };
  }
  // Bounded by the screen it opens on, so it is not clipped on a laptop.
  const height = Math.min(900, Math.max(560, window.screen.availHeight - 120));
  return { width: 760, height };
};

export const VNCButton = ({ peer, isDropdown = false }: Props) => {
  const { permission } = usePermissions();

  // netbirdVNCAvailable covers both halves of the NetBird path: the client
  // must ship a capturer for the peer's system, and the peer must have the
  // server switched on. Either missing leaves only the external path, which
  // still works, so neither hides the action.
  const netbirdVNCAvailable =
    isNetBirdVNCSupportedOnOS(peer?.os) &&
    !!peer?.local_flags?.server_vnc_allowed;
  // Enabled without NetBird screen sharing too: the viewer can still offer a
  // third-party VNC server on the peer, and its setup screen is where that
  // choice belongs. A button disabled behind a tooltip could only describe the
  // one option, and would hide the other entirely.
  const disabled = !peer.connected || !permission.peers.update;
  const hasPermission = permission.peers.update;

  const openVNCPage = () => {
    const { width, height } = viewerWindowSize(peer?.os);
    window.open(
      `/peer/vnc?id=${peer.id}`,
      "_blank",
      `noopener,noreferrer,width=${width},height=${height},left=100,top=100,location=no,toolbar=no,menubar=no,status=no`,
    );
  };

  return (
    <div>
      <VNCTooltip
        isOnline={peer.connected}
        isVNCEnabled={netbirdVNCAvailable}
        isNetBirdVNCSupported={isNetBirdVNCSupportedOnOS(peer?.os)}
        hasPermission={hasPermission}
        side={isDropdown ? "left" : "top"}
      >
        {isDropdown ? (
          <DropdownMenuItem
            onClick={openVNCPage}
            disabled={disabled}
            className={"w-full"}
          >
            <div className={"flex gap-3 items-center w-full"}>
              <ScreenShareIcon size={14} className={"shrink-0"} />
              VNC
            </div>
          </DropdownMenuItem>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={openVNCPage}
            disabled={disabled}
          >
            <ScreenShareIcon size={16} />
            VNC
            {disabled && <CircleHelpIcon size={12} />}
          </Button>
        )}
      </VNCTooltip>
    </div>
  );
};
